export interface ScreenshotOptions {
  width: number;
  showHeader: boolean;
  showDate: boolean;
  showPreview: boolean;
}

export interface ParsedEmail {
  html: string;
  subject: string;
  from: string;
  date: string;
  previewText: string;
}
