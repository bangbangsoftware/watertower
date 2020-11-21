interface Store {
  save: Function;
  load: Function;
  currentID: Function;
  close: Function;
}

export type { Store };
