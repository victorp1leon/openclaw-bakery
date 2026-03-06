export type ToolExecutionResult<T = Record<string, unknown>> = {
  ok: boolean;
  dry_run: boolean;
  operation_id: string;
  payload: T;
  detail: string;
};

