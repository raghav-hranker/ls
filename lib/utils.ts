import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from "dayjs"
import { createHmac } from 'crypto';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export  function getFormattedDate (value: any, dateFormat: string) {
  // Input	Example	Description
  // YY	01	Two-digit year
  // YYYY	2001	Four-digit year
  // M	1-12	Month, beginning at 1
  // MM	01-12	Month, 2-digits
  // MMM	Jan-Dec	The abbreviated month name
  // MMMM	January-December	The full month name
  // D	1-31	Day of month
  // DD	01-31	Day of month, 2-digits
  // H	0-23	Hours
  // HH	00-23	Hours, 2-digits
  // h	1-12	Hours, 12-hour clock
  // hh	01-12	Hours, 12-hour clock, 2-digits
  // m	0-59	Minutes
  // mm	00-59	Minutes, 2-digits
  // s	0-59	Seconds
  // ss	00-59	Seconds, 2-digits
  // S	0-9	Hundreds of milliseconds, 1-digit
  // SS	00-99	Tens of milliseconds, 2-digits
  // SSS	000-999	Milliseconds, 3-digits
  // Z	-05:00	Offset from UTC
  // ZZ	-0500	Compact offset from UTC, 2-digits
  // A	AM PM	Post or ante meridiem, upper-case
  // a	am pm	Post or ante meridiem, lower-case
  // Do	1st... 31st	Day of Month with ordinal
  // X	1410715640.579	Unix timestamp
  // x	1410715640579	Unix ms timestamp

  return dayjs(value).format(dateFormat);
}

export function verifyToken(token: string) {
  const verifySignature = (token: string, secret: string): boolean => {
    try {
      const [headerB64, payloadB64, signature] = token.split('.');
      
      // Create the expected signature
      const hmac = createHmac('sha256', secret);
      hmac.update(`${headerB64}.${payloadB64}`);
      const expectedSignature = hmac
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      return expectedSignature === signature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  };
  
  const JWT_SECRET = process.env.JWT_SECRET || 'parikshaSecretKey@12';
  
  if (!verifySignature(token, JWT_SECRET)) {
    return { valid: false, error: 'Invalid token signature' };
  }
}
