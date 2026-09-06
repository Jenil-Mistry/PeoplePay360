export type LogLevel = "INFO" | "WARN" | "ERROR";

function formatMessage(level: LogLevel, context: string, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level}] [${context}] ${message}${metaStr}`;
}

export const logger = {
  info: (context: string, message: string, meta?: any) => {
    console.log(formatMessage("INFO", context, message, meta));
  },
  warn: (context: string, message: string, meta?: any) => {
    console.warn(formatMessage("WARN", context, message, meta));
  },
  error: (context: string, message: string, error?: any, meta?: any) => {
    const errorDetails = error instanceof Error ? error.stack || error.message : error;
    console.error(formatMessage("ERROR", context, message, { error: errorDetails, ...meta }));
  }
};
