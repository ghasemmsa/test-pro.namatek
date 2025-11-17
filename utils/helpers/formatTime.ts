import { format, getTime, formatDistanceToNow } from 'date-fns';

// ----------------------------------------------------------------------

type InputValue = Date | string | number | null;

export function fDate(date: InputValue, newFormat?: string) {
  const fm = newFormat || 'dd MMM yyyy';

  return date ? format(new Date(date), fm) : '';
}

export function fDateTime(date: InputValue, newFormat?: string) {
  const fm = newFormat || 'dd MMM yyyy p';

  return date ? format(new Date(date), fm) : '';
}

export function fTimestamp(date: InputValue) {
  return date ? getTime(new Date(date)) : '';
}

export function fToNow(date: InputValue) {
  return date
    ? formatDistanceToNow(new Date(date), {
        addSuffix: true,
      })
    : '';
}
export function tovToString(a:number){
  // Calculate hours, minutes, and seconds
  const hours = Math.floor(a / 3600);
  const minutes = Math.floor((a % 3600) / 60);
  const seconds = a % 60;

  // Format each part with leading zeros if necessary
  const shours = String(hours).padStart(2, '0');
  const sminutes = String(minutes).padStart(2, '0');
  const sseconds = String(seconds).padStart(2, '0');

  // Return formatted string
  return `${shours}:${sminutes}:${sseconds}`;
}

export function durationToString(a :number,hour :string,minute : string){
  if(a<60)
  return '-'
  if(a<3600)
  return `${Math.floor(((a/60)%60)).toFixed(0)} ${minute}`
  return `${(Math.floor(a / 3600)).toFixed(0)} ${hour} ${Math.floor(((a/60)%60)).toFixed(0)} ${minute}`
}
