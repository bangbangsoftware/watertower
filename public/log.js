const options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  };

const log = message =>{
    const date = new Intl.DateTimeFormat('default',options).format(new Date());
    console.log(date, message);
}

const error = message =>{
    const date = new Intl.DateTimeFormat('default',options).format(new Date());
    console.error(date, message);
}

export {log, error};