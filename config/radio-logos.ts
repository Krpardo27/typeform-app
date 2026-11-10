import { radioWorkspaceTemplates } from "./radio-workspaces";

type RadioName = (typeof radioWorkspaceTemplates)[number]["name"];

const radioLogoPaths: Record<RadioName, string> = {
  ADN: "/logo-radios/adn.png",
  CONCIERTO: "/logo-radios/concierto.png",
  CORAZÓN: "/logo-radios/corazon.png",
  FMDOS: "/logo-radios/fmdos.png",
  FUTURO: "/logo-radios/futuro.png",
  IMAGINA: "/logo-radios/imagina.png",
  LOS40: "/logo-radios/los40.png",
  PUDAHUEL: "/logo-radios/pudahuel.png",
  ACTIVA: "/logo-radios/radioactiva.png",
};

function normalizeRadioName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^RADIO/, "");
}

export function getWorkspaceRadioLogo(workspace: {
  name: string;
  typeformId: string;
  templateFormTypeformId: string | null;
}) {
  const radio = radioWorkspaceTemplates.find((radio) => radio.typeformId === workspace.typeformId.trim())
    ?? radioWorkspaceTemplates.find((radio) => radio.templateFormTypeformId === workspace.templateFormTypeformId?.trim())
    ?? radioWorkspaceTemplates.find((radio) => normalizeRadioName(radio.name) === normalizeRadioName(workspace.name));

  return radio ? { name: radio.name, src: radioLogoPaths[radio.name] } : null;
}