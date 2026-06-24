"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Form from "@/shared/components/forms/Form";
import FormSubmit from "@/shared/components/forms/FormSubmit";
import { updateArtist } from "@/features/admin/artists/actions/update-artist-action";
import { ArtistSchema } from "@/features/admin/artists/schemas/artist.schema";

type Props = {
  children?: React.ReactNode;
};

export default function EditArtistForm({ children }: Props) {
  const router = useRouter();
  const params = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const id = Number(params.id);

    if (Number.isNaN(id)) {
      toast.error("ID inválido");
      setIsSubmitting(false);
      return;
    }

    const data = {
      name: formData.get("name")?.toString() || "",
      artistName: formData.get("artistName")?.toString() || "",
      categoryIds: formData.getAll("categoryIds"),
      image: formData.get("image")?.toString() || "",
      description: formData.get("description")?.toString() || "",
      videoUrl: formData.get("videoUrl")?.toString() || "",
      spotifyEmbedUrl: formData.get("spotifyEmbedUrl")?.toString() || "",
      spotifyArtistUrl: formData.get("spotifyArtistUrl")?.toString() || "",
      director: formData.get("director")?.toString() || "",
    };

    const result = ArtistSchema.safeParse(data);

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        toast.error(issue.message);
      });

      setIsSubmitting(false);
      return;
    }

    try {
      const response = await updateArtist(result.data, id);

      if (response?.errors) {
        response.errors.forEach((issue) => {
          toast.error(issue.message);
        });

        setIsSubmitting(false);
        return;
      }

      toast.success("Nominado actualizado correctamente");

      router.replace("/admin/nominados");
    } catch (error) {
      console.error("Error actualizando artista:", error);

      toast.error("Error actualizando artista");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-10 py-10 rounded-md shadow-md max-w-3xl mx-auto">
      <Form onSubmit={handleSubmit} className="space-y-5">
        {children}

        <FormSubmit
          value={isSubmitting ? "Guardando..." : "Guardar cambios"}
          disabled={isSubmitting}
          className="w-full bg-amber-400 text-black py-3 rounded-xl"
        />
      </Form>
    </div>
  );
}
