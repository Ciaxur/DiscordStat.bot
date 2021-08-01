import * as Colors from 'https://deno.land/std@0.101.0/fmt/colors.ts';

/** Log Instance */
export class LogInterface {
  /**
   * Prints Error to log in format specific to Error Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
   public Error(str: string, ...vars: any[]): void {}

  /**
   * Prints Info to log in format specific to Info Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Info(str: string, ...vars: any[]): void {}

  /**
   * Prints Warning to log in format specific to Warning Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Warning(str: string, ...vars: any[]): void {}

  /**
   * Prints Regular log in format specific to Regular Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Print(str: string, ...vars: any[]): void {}

  /**
   * Prints Debug log in format specific to Debug Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Debug(str: string, ...vars: any[]): void {}

  /**
   * Prints Internal info log in format specific to Internal Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Internal(fn_name: string, str: string, ...vars: any[]): void {}
}

/** Log Handler */
export class Log implements LogInterface {
  /**
   * Prints Error to log in format specific to Error Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Error(str: string, ...vars: any[]): void {
    this.print(str, 0xCC2010, ...vars);
  }

  /**
   * Prints Info to log in format specific to Info Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Info(str: string, ...vars: any[]): void {
    this.print(str, 0x20C97D, ...vars);
  }

  /**
   * Prints Warning to log in format specific to Warning Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Warning(str: string, ...vars: any[]): void {
    this.print(str, 0xF2A71B, ...vars);
  }

  /**
   * Prints Regular log in format specific to Regular Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Print(str: string, ...vars: any[]): void {
    this.print(str, 0xF2F0D0, ...vars);
  }

  /**
   * Prints Debug log in format specific to Debug Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Debug(str: string, ...vars: any[]): void {
    this.print(str, 0xF24987, ...vars);
  }

  /**
   * Prints Internal info log in format specific to Internal Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Internal(fn_name: string, str: string, ...vars: any[]): void {
    this.print(`<${fn_name}> - ${str}`, 0xF27405, ...vars);
  }

  private print(str: string, color: number, ...vars: any[]): void {
    console.log(
      Log.getTimestamp() + '\n\t' +
      Colors.rgb24(
        str + vars.join(' ')
        , color
      ),
    );
  }

  /**
   * Generates a prefixed Timestamp string
   */
  private static getTimestamp(): string {
    const date = new Date();
    return `[${date.toLocaleString()} - ${date.getTime()}]`;
  }
}