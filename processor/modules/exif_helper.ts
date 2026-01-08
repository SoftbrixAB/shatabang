// ex: 2015:12:11 12:10:09
const dateRegexp = /^([\d]{2,4}).?(\d{1,2}).?(\d{1,2})\s(\d{1,2}).?(\d{1,2}).?(\d{1,2})/;

export interface ExifDate {
  year: string;
  month: string;
  day: string;
  date: string;
  hour: string;
  minute: string;
  second: string;
  time: string;
}

export interface ExifInfo {
  CreateDate?: string;
  ModifyDate?: string;
}

export default {
  getDate(exifInfo: ExifInfo): ExifDate | undefined {
    const date = exifInfo.CreateDate || exifInfo.ModifyDate;
    const result = dateRegexp.exec(date || '');

    if (result && result.length > 3) {
      return {
        year: result[1],
        month: result[2],
        day: result[3],
        date: result[1] + '-' + result[2] + '-' + result[3],
        hour: result[4],
        minute: result[5],
        second: result[6],
        time: result[4] + ':' + result[5] + ':' + result[6]
      };
    } else {
      console.log("Failed to parse the date in the exif information");
      return undefined;
    }
  }
};
