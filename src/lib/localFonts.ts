type LocalFontOptions = {
  variable?: string;
  [key: string]: unknown;
};

type LocalFont = {
  className: string;
  variable: string;
};

function localFontClass(name: string, options: LocalFontOptions = {}): LocalFont {
  const variable = options.variable?.replace(/^--/, "font-var-") ?? `font-local-${name}`;

  return {
    className: `font-local-${name}`,
    variable,
  };
}

export function DM_Sans(options?: LocalFontOptions) {
  return localFontClass("dm-sans", options);
}

export function DM_Serif_Display(options?: LocalFontOptions) {
  return localFontClass("dm-serif-display", options);
}

export function PT_Mono(options?: LocalFontOptions) {
  return localFontClass("pt-mono", options);
}

export function Playfair_Display(options?: LocalFontOptions) {
  return localFontClass("playfair-display", options);
}

export function Noto_Sans(options?: LocalFontOptions) {
  return localFontClass("noto-sans", options);
}

export function Fredoka(options?: LocalFontOptions) {
  return localFontClass("fredoka", options);
}

export function Schoolbell(options?: LocalFontOptions) {
  return localFontClass("schoolbell", options);
}

export function Roboto(options?: LocalFontOptions) {
  return localFontClass("roboto", options);
}

export function Poppins(options?: LocalFontOptions) {
  return localFontClass("poppins", options);
}

export function Bebas_Neue(options?: LocalFontOptions) {
  return localFontClass("bebas-neue", options);
}
