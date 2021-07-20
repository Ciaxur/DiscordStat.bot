import * as Colors from 'https://deno.land/std@0.101.0/fmt/colors.ts';

/** Singleton Logger Class */
export default class Logger {
  private static instance: Logger;

  // Message Hooks
  private errorMsgHook: null | ((err: string) => void) = null;
  private InfoMsgHook: null | ((err: string) => void) = null;
  private WarningMsgHook: null | ((err: string) => void) = null;
  private DebugMsgHook: null | ((err: string) => void) = null;
  private InternalMsgHook: null | ((err: string) => void) = null;
  private PrintMsgHook: null | ((err: string) => void) = null;


  private constructor() {}

  static getInstance(): Logger {
    if (!this.instance)
      this.instance = new Logger();
    return this.instance;
  }

  /**
   * Prints Error to log in format specific to Error Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Error(str: string, ...vars: any[]): void {
    this.print(str, 0xCC2010, ...vars);

    // Call Message Hook
    if (this.errorMsgHook) this.errorMsgHook(str + vars.join(' '));
  }

  /**
   * Prints Info to log in format specific to Info Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Info(str: string, ...vars: any[]): void {
    this.print(str, 0x20C97D, ...vars);

    // Call Message Hook
    if (this.InfoMsgHook) this.InfoMsgHook(str + vars.join(' '));
  }

  /**
   * Prints Warning to log in format specific to Warning Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Warning(str: string, ...vars: any[]): void {
    this.print(str, 0xF2A71B, ...vars);

    // Call Message Hook
    if (this.WarningMsgHook) this.WarningMsgHook(str + vars.join(' '));
  }

  /**
   * Prints Regular log in format specific to Regular Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Print(str: string, ...vars: any[]): void {
    this.print(str, 0xF2F0D0, ...vars);

    // Call Message Hook
    if (this.PrintMsgHook) this.PrintMsgHook(str + vars.join(' '));
  }

  /**
   * Prints Debug log in format specific to Debug Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Debug(str: string, ...vars: any[]): void {
    this.print(str, 0xF24987, ...vars);

    // Call Message Hook
    if (this.DebugMsgHook) this.DebugMsgHook(str + vars.join(' '));
  }

  /**
   * Prints Internal info log in format specific to Internal Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Internal(fn_name: string, str: string, ...vars: any[]): void {
    this.print(`<${fn_name}> - ${str}`, 0xF27405, ...vars);
    
    // Call Message Hook
    if (this.InternalMsgHook) this.InternalMsgHook(`<${fn_name}> - ${str}` + vars.join(' '));
  }

  /**
   * Sets a Message Function Hook that will be called
   *  after Error gets logged
   * @param fn Function to call
   */
  public setErrorMessageHook(fn: (err: string) => void) {
    this.errorMsgHook = fn;
  }

  private print(str: string, color: number, ...vars: any[]): void {
    console.log(
      this.getTimestamp() + '\n\t' +
      Colors.rgb24(
        str + vars.join(' ')
        , color
      ),
    );
  }

  /**
   * Generates a prefixed Timestamp string
   */
  private getTimestamp(): string {
    const date = new Date();
    return `[${date.toLocaleString()} - ${date.getTime()}]`;
  }
}
