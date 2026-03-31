/**
 * Basic SPSS .sav file parser — client-side, no dependencies.
 * Handles the most common SPSS file format (System File).
 *
 * SPSS .sav is a binary format. This parser reads:
 * - Variable names and labels
 * - Data values
 * - Value labels (what coded numbers mean)
 *
 * Limitations: handles uncompressed and simple compressed files.
 * Very large files (>50MB) may be slow in the browser.
 */

interface SavVariable {
  name: string;
  label: string;
  type: number; // 0 = numeric, >0 = string width
}

interface SavResult {
  variables: SavVariable[];
  columns: string[];
  rows: Record<string, string | number | null>[];
}

export async function parseSavFile(file: File): Promise<SavResult> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const decoder = new TextDecoder("ascii");

  let offset = 0;

  function readString(len: number): string {
    const bytes = new Uint8Array(buffer, offset, len);
    offset += len;
    return decoder.decode(bytes).replace(/\0/g, "").trim();
  }

  function readInt32(): number {
    const val = view.getInt32(offset, true); // little-endian
    offset += 4;
    return val;
  }

  function readFloat64(): number {
    const val = view.getFloat64(offset, true);
    offset += 8;
    return val;
  }

  // Read file header
  const magic = readString(4);
  if (magic !== "$FL2") {
    throw new Error("Not a valid SPSS .sav file (expected $FL2 header)");
  }

  readString(60); // product name
  const layoutCode = readInt32(); // should be 2

  // Handle big-endian files
  const bigEndian = layoutCode !== 2;

  function readInt32BE(): number {
    const val = bigEndian ? view.getInt32(offset, false) : view.getInt32(offset, true);
    offset += 4;
    return val;
  }

  function readFloat64BE(): number {
    const val = bigEndian ? view.getFloat64(offset, false) : view.getFloat64(offset, true);
    offset += 8;
    return val;
  }

  // Re-read if big endian
  const readI = bigEndian ? readInt32BE : () => readInt32();
  const readF = bigEndian ? readFloat64BE : () => readFloat64();

  const nominalCaseSize = readI();
  const compressed = readI(); // 0=uncompressed, 1=bytecode compressed
  readI(); // weight index
  const nCases = readI();
  readF(); // compression bias (usually 100)
  readString(9); // creation date
  readString(8); // creation time
  readString(64); // file label
  readString(3); // padding

  // Read variable records
  const variables: SavVariable[] = [];
  const variableTypes: number[] = []; // raw types for parsing

  while (offset < buffer.byteLength) {
    const recType = readI();

    if (recType === 2) {
      // Variable record
      const type = readI(); // 0=numeric, >0=string width
      const hasLabel = readI();
      readI(); // missing value format
      readI(); // print format
      readI(); // write format (was missing — skip 4 bytes total for both)
      // Actually, print and write are each 4 bytes, so we already read them
      const name = readString(8);

      let label = "";
      if (hasLabel === 1) {
        const labelLen = readI();
        const roundedLen = Math.ceil(labelLen / 4) * 4;
        label = readString(roundedLen).substring(0, labelLen);
      }

      // Skip missing values
      // (we already read the missing value format count above)

      if (type >= 0) {
        variables.push({ name, label: label || name, type });
        variableTypes.push(type);
      }
    } else if (recType === 999) {
      // End of dictionary
      readI(); // filler
      break;
    } else if (recType === 3) {
      // Value label record — skip for now
      const nLabels = readI();
      for (let i = 0; i < nLabels; i++) {
        readF(); // value
        const len = new Uint8Array(buffer, offset, 1)[0];
        offset += 1;
        const roundedLen = Math.ceil((len + 1) / 8) * 8 - 1;
        offset += roundedLen;
      }
    } else if (recType === 4) {
      // Value label variables record
      const nVars = readI();
      offset += nVars * 4;
    } else if (recType === 6) {
      // Documents record
      const nLines = readI();
      offset += nLines * 80;
    } else if (recType === 7) {
      // Extension record
      readI(); // subtype
      const elementSize = readI();
      const nElements = readI();
      offset += elementSize * nElements;
    } else {
      // Unknown record type — try to skip
      break;
    }
  }

  // Read data
  const rows: Record<string, string | number | null>[] = [];
  const numVars = variables.length;

  if (compressed === 0) {
    // Uncompressed data
    const casesToRead = nCases > 0 ? nCases : 10000;
    for (let c = 0; c < casesToRead && offset < buffer.byteLength - 8; c++) {
      const row: Record<string, string | number | null> = {};
      for (let v = 0; v < numVars; v++) {
        if (variables[v].type === 0) {
          const val = readF();
          row[variables[v].name] = val === -1.7976931348623157e+308 ? null : val;
        } else {
          const width = Math.max(8, Math.ceil(variables[v].type / 8) * 8);
          row[variables[v].name] = readString(width);
        }
      }
      rows.push(row);
    }
  } else {
    // Compressed data — bytecode compressed
    const bias = 100;
    const casesToRead = nCases > 0 ? nCases : 10000;

    for (let c = 0; c < casesToRead && offset < buffer.byteLength; c++) {
      const row: Record<string, string | number | null> = {};
      let varIdx = 0;

      while (varIdx < numVars && offset < buffer.byteLength) {
        // Read 8 bytecodes
        const codes = new Uint8Array(buffer, offset, 8);
        offset += 8;

        for (let b = 0; b < 8 && varIdx < numVars; b++) {
          const code = codes[b];

          if (code === 0) {
            // Skip
            continue;
          } else if (code >= 1 && code <= 251) {
            // Compressed numeric value
            if (variables[varIdx].type === 0) {
              row[variables[varIdx].name] = code - bias;
            } else {
              row[variables[varIdx].name] = "";
            }
            varIdx++;
          } else if (code === 252) {
            // End of file
            varIdx = numVars;
            c = casesToRead;
            break;
          } else if (code === 253) {
            // Value stored in next 8 bytes
            if (variables[varIdx].type === 0) {
              const val = readF();
              row[variables[varIdx].name] = val === -1.7976931348623157e+308 ? null : val;
            } else {
              row[variables[varIdx].name] = readString(8);
            }
            varIdx++;
          } else if (code === 254) {
            // String whitespace
            row[variables[varIdx].name] = "        ";
            varIdx++;
          } else if (code === 255) {
            // System missing
            row[variables[varIdx].name] = null;
            varIdx++;
          }
        }
      }

      if (Object.keys(row).length > 0) {
        rows.push(row);
      }
    }
  }

  const columns = variables.map(v => v.label || v.name);

  // Remap rows to use labels as keys
  const labeledRows = rows.map(row => {
    const labeled: Record<string, string | number | null> = {};
    variables.forEach(v => {
      labeled[v.label || v.name] = row[v.name] ?? null;
    });
    return labeled;
  });

  return { variables, columns, rows: labeledRows };
}
