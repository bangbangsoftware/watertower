const log = message =>{
    const date = new Date();
    console.log(date, message);
}

const error = message =>{
    const date = new Date();
    console.error(date, message);
}

export {log, error};