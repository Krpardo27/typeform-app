import { describe, expect, it } from "vitest";
import {
  ADN_TEMPLATE_FORM_ID,
  ADN_TYPEFORM_ID,
  LOS40_TEMPLATE_FORM_ID,
  LOS40_TYPEFORM_ID,
  getEmbedInfo,
} from "../embed-info";

const FORM_ID = "abc123";

describe("getEmbedInfo", () => {
  describe("workspace ADN (2828888)", () => {
    it("devuelve el label correcto", () => {
      const { label } = getEmbedInfo(FORM_ID, ADN_TYPEFORM_ID);
      expect(label).toBe("Código iframe (ADN)");
    });

    it("genera un iframe con la URL de prisa.typeform.com", () => {
      const { code } = getEmbedInfo(FORM_ID, ADN_TYPEFORM_ID);
      expect(code).toContain(`https://prisa.typeform.com/to/${FORM_ID}`);
    });

    it("el iframe tiene los atributos requeridos", () => {
      const { code } = getEmbedInfo(FORM_ID, ADN_TYPEFORM_ID);
      expect(code).toContain('id="typeform-full"');
      expect(code).toContain('frameborder="0"');
      expect(code).toContain('height="600"');
      expect(code).toContain('width="100%"');
    });

    it("el code es un iframe completo (abre y cierra la etiqueta)", () => {
      const { code } = getEmbedInfo(FORM_ID, ADN_TYPEFORM_ID);
      expect(code).toMatch(/^<iframe /);
      expect(code).toMatch(/<\/iframe>$/);
    });
  });

  describe("workspace LOS40 (416594)", () => {
    it("devuelve el label correcto", () => {
      const { label } = getEmbedInfo(FORM_ID, LOS40_TYPEFORM_ID);
      expect(label).toBe("Código iframe (LOS40)");
    });

    it("genera un iframe con la URL de concursos.los40.cl", () => {
      const { code } = getEmbedInfo(FORM_ID, LOS40_TYPEFORM_ID);
      expect(code).toContain(`https://concursos.los40.cl/t/?id=${FORM_ID}`);
    });

    it("el iframe incluye referrerpolicy unsafe-url", () => {
      const { code } = getEmbedInfo(FORM_ID, LOS40_TYPEFORM_ID);
      expect(code).toContain('referrerpolicy="unsafe-url"');
    });

    it("el iframe tiene los atributos de layout requeridos", () => {
      const { code } = getEmbedInfo(FORM_ID, LOS40_TYPEFORM_ID);
      expect(code).toContain('id="concurso"');
      expect(code).toContain('width="100%"');
      expect(code).toContain('height="600px"');
      expect(code).toContain('scrolling="no"');
      expect(code).toContain("border:none");
    });

    it("el code es un iframe completo (abre y cierra la etiqueta)", () => {
      const { code } = getEmbedInfo(FORM_ID, LOS40_TYPEFORM_ID);
      expect(code).toMatch(/^<iframe /);
      expect(code).toMatch(/<\/iframe>$/);
    });
  });

  describe("workspace genérico (sin iframe especial)", () => {
    it("devuelve el formId como code", () => {
      const { code } = getEmbedInfo(FORM_ID, "otro-workspace");
      expect(code).toBe(FORM_ID);
    });

    it("label indica formulario base cuando no hay clonedFrom", () => {
      const { label } = getEmbedInfo(FORM_ID, "otro-workspace");
      expect(label).toBe("Typeform ID del formulario base");
    });

    it("label indica duplicado cuando se pasa clonedFrom", () => {
      const { label } = getEmbedInfo(FORM_ID, "otro-workspace", "source-id");
      expect(label).toBe("Typeform ID del duplicado");
    });
  });

  describe("workspace creado desde plantilla con iframe especial", () => {
    it("genera el iframe exacto de ADN desde su plantilla base", () => {
      const { code, src } = getEmbedInfo(
        "NWJLKpDj",
        "workspace-nuevo",
        undefined,
        ADN_TEMPLATE_FORM_ID,
      );

      expect(src).toBe("https://prisa.typeform.com/to/NWJLKpDj");
      expect(code).toBe(
        '<iframe frameborder="0" height="600" id="typeform-full" src="https://prisa.typeform.com/to/NWJLKpDj" width="100%"></iframe>',
      );
    });

    it("genera el iframe exacto de LOS40 desde su plantilla base", () => {
      const { code, src } = getEmbedInfo(
        "ACJWBsMI",
        "workspace-nuevo",
        undefined,
        LOS40_TEMPLATE_FORM_ID,
      );

      expect(src).toBe("https://concursos.los40.cl/t/?id=ACJWBsMI");
      expect(code).toBe(
        '<iframe id="concurso" width="100%" height="600px" referrerpolicy="unsafe-url" src="https://concursos.los40.cl/t/?id=ACJWBsMI" scrolling="no" marginwidth="0" marginheight="0" style="border:none;"></iframe>',
      );
    });

    it("resuelve iframe ADN desde templateFormTypeformId", () => {
      const { code, label } = getEmbedInfo(
        FORM_ID,
        "workspace-nuevo",
        undefined,
        ADN_TEMPLATE_FORM_ID,
      );

      expect(label).toBe("Código iframe (ADN)");
      expect(code).toContain(`https://prisa.typeform.com/to/${FORM_ID}`);
      expect(code).toMatch(/^<iframe /);
      expect(code).toMatch(/<\/iframe>$/);
    });

    it("resuelve iframe LOS40 desde templateFormTypeformId", () => {
      const { code, label } = getEmbedInfo(
        FORM_ID,
        "workspace-nuevo",
        undefined,
        LOS40_TEMPLATE_FORM_ID,
      );

      expect(label).toBe("Código iframe (LOS40)");
      expect(code).toContain(`https://concursos.los40.cl/t/?id=${FORM_ID}`);
      expect(code).toContain('referrerpolicy="unsafe-url"');
      expect(code).toMatch(/^<iframe /);
      expect(code).toMatch(/<\/iframe>$/);
    });

    it("resuelve iframe LOS40 desde clonedFrom si falta templateFormTypeformId", () => {
      const { code, label } = getEmbedInfo(
        "ACJWBsMI",
        "workspace-nuevo",
        LOS40_TEMPLATE_FORM_ID,
      );

      expect(label).toBe("Código iframe (LOS40)");
      expect(code).toContain("https://concursos.los40.cl/t/?id=ACJWBsMI");
    });

    it("resuelve iframe ADN si el formId es la plantilla base", () => {
      const { code, label } = getEmbedInfo(
        ADN_TEMPLATE_FORM_ID,
        "workspace-nuevo",
      );

      expect(label).toBe("Código iframe (ADN)");
      expect(code).toContain(`https://prisa.typeform.com/to/${ADN_TEMPLATE_FORM_ID}`);
    });
  });

  describe("el formId se incrusta correctamente en la URL", () => {
    it("un formId distinto genera URLs distintas en ADN", () => {
      const { code: codeA } = getEmbedInfo("form-aaa", ADN_TYPEFORM_ID);
      const { code: codeB } = getEmbedInfo("form-bbb", ADN_TYPEFORM_ID);
      expect(codeA).not.toBe(codeB);
      expect(codeA).toContain("form-aaa");
      expect(codeB).toContain("form-bbb");
    });

    it("un formId distinto genera URLs distintas en LOS40", () => {
      const { code: codeA } = getEmbedInfo("form-aaa", LOS40_TYPEFORM_ID);
      const { code: codeB } = getEmbedInfo("form-bbb", LOS40_TYPEFORM_ID);
      expect(codeA).not.toBe(codeB);
      expect(codeA).toContain("form-aaa");
      expect(codeB).toContain("form-bbb");
    });
  });
});
