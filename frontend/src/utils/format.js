export const currency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
export const dateTime = (value) => value ? new Date(value).toLocaleString() : '-';
