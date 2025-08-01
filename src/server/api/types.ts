export type Pagination<T> = {
  data: Array<T>;
  pagination: {
    rowCount?: number;
  };
};

export type PageData<T> = T extends Pagination<infer U> ? U : never;
