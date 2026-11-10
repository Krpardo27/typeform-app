"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DuplicateFormResult } from "@/features/typeform/types/duplicate-form";
import { getDuplicateListDestination } from "@/features/typeform/utils/duplicate-navigation";
import type { DuplicateFormDialogProps, DuplicateFormRecovery } from "./DuplicateFormDialog";
import { useWorkspaceFormsGridOperation } from "./WorkspaceFormsGridLoadingGate";

type Options = {
  suggestedTitle: string;
  redirectTo: string;
  recoveryKey: string;
  create: (title: string, allowSameTitle: boolean) => Promise<DuplicateFormResult>;
  recover: (createdFormId: string) => Promise<DuplicateFormResult>;
};

type DialogState = Pick<DuplicateFormDialogProps, "initialTitle" | "initialRecovery" | "initialUncertain">;

export function useFormDuplication(options: Options) {
  const router = useRouter();
  const grid = useWorkspaceFormsGridOperation();
  const lock = useRef(false);
  const saving = useRef(false);
  const mounted = useRef(true);
  const originPathname = useRef("");
  const uncertain = useRef(false);
  const recovery = useRef<DuplicateFormRecovery | null>(null);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function saveRecovery(value: DuplicateFormRecovery | null) {
    recovery.current = value;
    try {
      if (value) sessionStorage.setItem(options.recoveryKey, JSON.stringify(value));
      else sessionStorage.removeItem(options.recoveryKey);
    } catch { /* El registro sigue disponible en memoria si storage está bloqueado. */ }
  }

  function setUncertain(value: boolean) {
    uncertain.current = value;
    try {
      if (value) sessionStorage.setItem(`${options.recoveryKey}:uncertain`, "1");
      else sessionStorage.removeItem(`${options.recoveryKey}:uncertain`);
    } catch { /* El aviso sigue disponible en memoria. */ }
  }

  function run<T>(task: () => Promise<T>): Promise<T> {
    if (grid) return grid.run(task);
    return new Promise<T>((resolve, reject) => {
      startTransition(async () => {
        try { resolve(await task()); }
        catch (error) { reject(error); }
      });
    });
  }

  function close() {
    if (saving.current) return;
    lock.current = false;
    grid?.release();
    if (mounted.current) setDialogState(null);
  }

  function duplicate(titleOverride?: string) {
    if (lock.current || isRefreshing || (grid && !grid.acquire())) return;
    lock.current = true;
    originPathname.current = window.location.pathname;
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(options.recoveryKey) ?? "null");
      if (saved && typeof saved === "object" && "createdFormId" in saved && "title" in saved &&
        typeof saved.createdFormId === "string" && saved.createdFormId.trim() && typeof saved.title === "string") {
        recovery.current = { createdFormId: saved.createdFormId, title: saved.title };
      }
      uncertain.current ||= sessionStorage.getItem(`${options.recoveryKey}:uncertain`) === "1";
    } catch { /* El storage es opcional. */ }

    setDialogState({
      initialTitle: recovery.current?.title ?? titleOverride ?? options.suggestedTitle,
      initialRecovery: recovery.current,
      initialUncertain: uncertain.current && !recovery.current,
    });
  }

  async function submit(title: string, allowSameTitle: boolean): Promise<DuplicateFormResult> {
    if (saving.current) {
      return { status: "failed", retrySafe: true, message: "Ya hay una solicitud en curso." };
    }
    saving.current = true;

    try {
      return await run(async () => {
        const result = recovery.current
          ? await options.recover(recovery.current.createdFormId)
          : await options.create(title, allowSameTitle);

        if (result.status === "partial") {
          saveRecovery({ createdFormId: result.createdFormId, title: result.title });
        } else if (result.status === "failed" && !result.retrySafe) {
          setUncertain(true);
        } else if (result.status === "success") {
          saveRecovery(null);
          setUncertain(false);
          toast.success("Formulario duplicado", { description: `“${result.form.title}” se registró correctamente.` });
          if (window.location.pathname === originPathname.current) {
            router.replace(getDuplicateListDestination(options.redirectTo, window.location.search));
            router.refresh();
          }
          lock.current = false;
          grid?.release();
          if (mounted.current) setDialogState(null);
        }
        return result;
      });
    } catch {
      if (recovery.current) {
        return {
          status: "partial",
          ...recovery.current,
          message: "La copia ya existe en Typeform. No pudimos completar su registro. Puedes recuperarlo sin crear otra copia.",
        };
      }
      setUncertain(true);
      return {
        status: "failed",
        retrySafe: false,
        message: "No pudimos confirmar la creación. Revisa el listado antes de volver a intentarlo.",
      };
    } finally {
      saving.current = false;
    }
  }

  const dialogProps: DuplicateFormDialogProps | null = dialogState
    ? { ...dialogState, onSubmit: submit, onClose: close }
    : null;

  return { duplicate, dialogProps, isPending: Boolean(dialogState) || isRefreshing || Boolean(grid?.busy) };
}