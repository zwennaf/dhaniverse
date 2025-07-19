import { IErrorHandler, ChunkError, ErrorHandlerResult } from './IErrorHandler.ts';

export abstract class BaseErrorHandler implements IErrorHandler {
  private nextHandler: IErrorHandler | null = null;

  public setNext(handler: IErrorHandler): IErrorHandler {
    this.nextHandler = handler;
    return handler;
  }

  public async handle(error: ChunkError): Promise<ErrorHandlerResult> {
    const result = await this.doHandle(error);
    
    if (!result.handled && this.nextHandler) {
      return this.nextHandler.handle(error);
    }
    
    return result;
  }

  protected abstract doHandle(error: ChunkError): Promise<ErrorHandlerResult>;
}