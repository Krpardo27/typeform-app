export type DuplicateFormResult =
  | { status: "success"; form: { id: string; title: string } }
  | {
      status: "name-conflict";
      message: string;
      matches: { id: string; title: string }[];
    }
  | {
      status: "partial";
      createdFormId: string;
      title: string;
      message: string;
    }
  | { status: "failed"; message: string; retrySafe: boolean };