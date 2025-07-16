const formatTimeToUTC = (dateString) => {
  const date = new Date(dateString);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDateOnly = (date) => {
  if (!date) return null;
  return date.toISOString().split("T")[0];
};

const formatDateToUTC = (dateString) => {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
};

const utcTimePlus7 = () => {
  const date = new Date();
  return new Date(date.getTime() + 7 * 60 * 60 * 1000);
};

const formatDateTimeWIB = (date) => {
  const dateObj = new Date(date);

  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getUTCDate()).padStart(2, "0");
  const hours = String(dateObj.getUTCHours()).padStart(2, "0");
  const minutes = String(dateObj.getUTCMinutes()).padStart(2, "0");
  const seconds = String(dateObj.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

module.exports = {
  utcTimePlus7,
  formatDateTimeWIB,
  formatDateTimeToUTC: (dateString) => {
    return `${formatDateToUTC(dateString)} ${formatTimeToUTC(dateString)}`;
  },
  formatDateOnly,
};
