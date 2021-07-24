import * as Colors from 'https://deno.land/std@0.101.0/fmt/colors.ts';

// Hook Definitino
type LogHook = (msg: string) => void;
type LogType = 'error' | 'info' | 'warning' | 'print' | 'debug' | 'internal';

/** Singleton Logger Class */
export default class Logger {
  private static instance: Logger;

  // Message Hooks
  private errorMsgHooks:     LogHook[] = [];
  private infoMsgHooks:      LogHook[] = [];
  private warningMsgHooks:   LogHook[] = [];
  private debugMsgHooks:     LogHook[] = [];
  private internalMsgHooks:  LogHook[] = [];
  private printMsgHooks:     LogHook[] = [];


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

    // Call Message Hooks
    this.errorMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Info to log in format specific to Info Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Info(str: string, ...vars: any[]): void {
    this.print(str, 0x20C97D, ...vars);

    // Call Message Hooks
    this.infoMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Warning to log in format specific to Warning Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Warning(str: string, ...vars: any[]): void {
    this.print(str, 0xF2A71B, ...vars);

    // Call Message Hooks
    this.warningMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Regular log in format specific to Regular Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Print(str: string, ...vars: any[]): void {
    this.print(str, 0xF2F0D0, ...vars);

    // Call Message Hooks
    this.printMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Debug log in format specific to Debug Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Debug(str: string, ...vars: any[]): void {
    this.print(str, 0xF24987, ...vars);

    // Call Message Hook
    this.debugMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Internal info log in format specific to Internal Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Internal(fn_name: string, str: string, ...vars: any[]): void {
    this.print(`<${fn_name}> - ${str}`, 0xF27405, ...vars);
    
    // Call Message Hook
    this.internalMsgHooks.forEach(hook => hook(`<${fn_name}> - ${str}` + vars.join(' ')));
  }

  /**
   * Adds a Message Function Hook that will be called
   *  after the Type of Log gets logged
   * @param hookType Type of Hook to add
   * @param fn Function to add
   */
  public addMessageHook(fn: LogHook, type: LogType) {
    switch(type) {
      case 'debug':
        this.debugMsgHooks.push(fn);
        break;
      case 'error':
        this.errorMsgHooks.push(fn);
        break;
      case 'info':
        this.infoMsgHooks.push(fn);
        break;
      case 'internal':
        this.internalMsgHooks.push(fn);
        break;
      case 'print':
        this.printMsgHooks.push(fn);
        break;
      case 'warning':
        this.warningMsgHooks.push(fn);
        break;
    }
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
