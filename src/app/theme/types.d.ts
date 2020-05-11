import { SimplePaletteColorOptions, ThemeOptions } from "@material-ui/core";
import { PaletteOptions, TypeBackground } from "@material-ui/core/styles/createPalette";
import { SpacingOptions } from "@material-ui/core/styles/createSpacing";
import { Breakpoints } from "@material-ui/core/styles/createBreakpoints";

export type AppTypeBackground = {
  contrast: string,
  tooltip: string,
  paperOpposite: string,
  readOnly: string
}

export interface AppColors {
  zilliqa: any,
  switcheo: any,
}
export interface AppPalette extends PaletteOptions {
  primary: SimplePaletteColorOptions;
  secondary: SimplePaletteColorOptions;
  background: AppTypeBackground & TypeBackground;
  toolbar: SimplePaletteColorOptions;
  colors: AppColors;
  switcheoLogo: string,
  navbar: string,
  mainBoxShadow: string,
}

export interface AppTheme extends ThemeOptions {
  palette: AppPalette;
  breakpoints: Breakpoints,
  spacing: ((factorX: number, factorY?: number) => string | number);
}