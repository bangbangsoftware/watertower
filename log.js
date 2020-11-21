const log = message =>{
    const date = new Date();
    console.log(date, message);
}

const error = (message, obj = "") =>{
    const date = new Date();
    console.error(date, message, obj);
}

export {log, error};