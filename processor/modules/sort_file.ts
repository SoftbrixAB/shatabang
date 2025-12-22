import * as path from 'path';
const shFiles = require('../common/shatabang_files');

interface ExifData {
  CreateDate?: string;
  ModifyDate?: string;
}

const sort_file = function(sourceFile: string, destDir: string, exifData: ExifData): Promise<string> {
  const dateStr = exifData.CreateDate || exifData.ModifyDate;
  if (dateStr === undefined) {
    throw new Error("Failed to parse the date in the exif information, '" + dateStr + "'");
  }
  const date = new Date(dateStr);
  const newPath = buildPathFromDate(date, destDir);
  const newFileName = buildFileNameFromDate(date, path.extname(sourceFile));
  return moveFile(sourceFile, newPath, newFileName);
};

const leftPad = function(d: number): string {
  return ("" + d).padStart(2, "0");
};

const buildPathFromDate = function(date: Date, destDir: string): string {
  const year = "" + date.getFullYear();
  const month = leftPad(date.getMonth() + 1);
  const day = leftPad(date.getDate());
  return path.join(destDir, year, month, day);
};

const buildFileNameFromDate = function(date: Date, fileExt: string): string {
  const hh = leftPad(date.getHours());
  const mm = leftPad(date.getMinutes());
  const ss = leftPad(date.getSeconds());
  const ms = leftPad(date.getMilliseconds());
  return hh + mm + ss + ms + fileExt;
};

const moveFile = function(sourceFile: string, destinationDir: string, fileName: string): Promise<string> {
  if (!shFiles.exists(destinationDir)) {
    shFiles.mkdirsSync(destinationDir);
  }

  const destination = path.join(destinationDir, fileName).toLowerCase();

  return shFiles.moveFile(sourceFile, destination);
};

export default sort_file;
