const getDate = (date = new Date()) => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDay()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

const log = (message) => {
  console.log(getDate(), message);
};

const error = (message, obj = "") => {
  console.error(getDate(), message, obj);
};

export { error, log };
