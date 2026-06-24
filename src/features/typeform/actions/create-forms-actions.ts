"use server";

export async function createFormAction(data: unknown) {
  void data;

  return {
    errors: [
      {
        message:
          "La creacion desde cero esta deshabilitada. Los editores deben duplicar un formulario base desde su workspace.",
      },
    ],
  };
}
