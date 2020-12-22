interface Store {
  save: Function;
  load: Function;
  currentID: Function;
  close: Function;
  saveUser: Function;
  adminUser: Function;
  validUser: Function;
}

export type { Store };
