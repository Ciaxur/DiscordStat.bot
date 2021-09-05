import * as Path from "https://deno.land/std@0.101.0/path/mod.ts";
import { Log, LogInterface } from './LogInterface.ts';

// Hook Definition
type LogHook = (msg: string) => void;
type LogType = 'error' | 'info' | 'warning' | 'print' | 'debug' | 'internal';


/** Singleton Logger Class */
export default class Logger implements LogInterface {
  private static instance: Logger;

  /*
    == Log Level ALL ==
    Hooks
    - Updated Configuration
    Bot Start
    - All logs for Bot init
  
    == Log Level 1 ==
    Actions Taken
    - Commands Executed
    - Bot Precense Change Notified
    - User Precense ACTUAL Change (not same as before)
    - New User Added
    - New Guild Added
    - Command Bot Tracking Issued
    - User opted in/out of Tracking
    Errors
    - All Errors

    == Log Level 2 ==
    Database Storage
    - Precense Entry
    - Precense Changes
    Developer Basics
    - Message origin
    - Internal Messages
    - Cache Autoscale

    == Log Level 3 ==
    Notifications
    - Verbose
    Cache Logs
    - All Cache Logs
    Database Requests
    - Fetch Summary
    - Update Queries
    - Not found Warnings
    - Guild Activites

    == Log Level 4 ==
    Verbose Actions & Storage
    - Full Verbose Precense Changes
    - Command not found

    == Log Level 5 ==
    VERBOSE ALL
  */
  private _log_level: number = 1;
  private _log_dir_path: string = 'logs';

  // Log Instances
  private noLogInstance:      LogInterface; // Used to NOT log if log level isn't met
  private defaultLogInstance: LogInterface; // Used as generic logging
  
  // Message Hooks
  private errorMsgHooks:     LogHook[] = [];
  private infoMsgHooks:      LogHook[] = [];
  private warningMsgHooks:   LogHook[] = [];
  private debugMsgHooks:     LogHook[] = [];
  private internalMsgHooks:  LogHook[] = [];
  private printMsgHooks:     LogHook[] = [];


  private constructor() {
    this.noLogInstance = new LogInterface();  // Empty Interface
    this.defaultLogInstance = new Log();      // Default Log
  }

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
    this.defaultLogInstance.Error(str, ...vars);

    // Call Message Hooks
    this.errorMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Info to log in format specific to Info Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Info(str: string, ...vars: any[]): void {
    this.defaultLogInstance.Info(str, ...vars);

    // Call Message Hooks
    this.infoMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Warning to log in format specific to Warning Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Warning(str: string, ...vars: any[]): void {
    this.defaultLogInstance.Warning(str, ...vars);

    // Call Message Hooks
    this.warningMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Regular log in format specific to Regular Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Print(str: string, ...vars: any[]): void {
    this.defaultLogInstance.Print(str, ...vars);

    // Call Message Hooks
    this.printMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Debug log in format specific to Debug Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Debug(str: string, ...vars: any[]): void {
    this.defaultLogInstance.Debug(str, ...vars);

    // Call Message Hook
    this.debugMsgHooks.forEach(hook => hook(str + vars.join(' ')));
  }

  /**
   * Prints Internal info log in format specific to Internal Logging Structure
   * @param str Main string to log
   * @param vars Variadic Variable
   */
  public Internal(fn_name: string, str: string, ...vars: any[]): void {
    this.defaultLogInstance.Internal(fn_name, str, ...vars);
    
    // Call Message Hook
    this.internalMsgHooks.forEach(hook => hook(`<${fn_name}> - ${str}` + vars.join(' ')));
  }

  /**
   * Creates a Log instance based on the log level specified
   * @param logLevel Log Level of the Log
   */
  public level(logLevel: number): LogInterface {
    if (logLevel <= this._log_level)
      return new Log();
    return this.noLogInstance;
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

  /**
   * Dumps given Error log to File
   * @param str Main string to log
   * @param vars Variadic Variable
   */
   public ErrorDump(str: string, ...vars: any[]): void {
     // Construct timestamp and logpath
     const now = Date.now();
     const log_path = Path.join(this._log_dir_path, `${now}_error_dump.log`);

     // Create Directory if not found
     try {
       console.log('Creating Dir', this._log_dir_path);
       Deno.mkdirSync(this._log_dir_path);
     } catch(e) {
       console.log('Directory already exists');
     }

     Deno.writeTextFileSync(
       log_path,
       vars.reduce((acc, elt) => (
         acc + '\n' +
         (elt instanceof Object
           ? elt instanceof Error
             ? 'Error Stack: ' + elt.stack
             : JSON.stringify(elt, null, 2)
           : elt.toString()
         )
       ), ''),
     );
   }

  // Getters & Setters
  public get logLevel() {
    return this._log_level;
  }
  public set logLevel(newLevel: number) {
    if (newLevel < 0) {
      this.Error(`Logger: Cannot set Log Level to ${newLevel}`);
      return;
    }
    this.Internal('Logger', `Log Level change from ${this._log_level} -> ${newLevel}`);
    this._log_level = newLevel;
  }

  public get log_dir_path() {
    return this._log_dir_path;
  }
  public set log_dir_path(newPath: string) {
    this._log_dir_path = newPath;
  }
}
