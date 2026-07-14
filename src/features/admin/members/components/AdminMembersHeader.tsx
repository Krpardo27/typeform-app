import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export function AdminMembersHeader() {
  return (
    <AdminPageHeader
      title="Agregar miembros"
      description="Autoriza emails para OTP y asigna workspace/rol sin tocar la base de datos manualmente."
    />
  );
}