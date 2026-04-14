"use client";

import { useState } from "react";
import { FaPaperPlane } from "react-icons/fa6";
import { ImSpinner2 } from "react-icons/im";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { requestVerificationEmail } from "@/lib/api/account";

export default function VerifyEmailButton() {
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      const res = await requestVerificationEmail();
      if (res.success) {
        toast.success("Correo de verificación enviado. Revisa tu bandeja.");
      } else {
        toast.error(res.message || "Error al enviar el correo");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleSend}
      disabled={loading}
      variant="default"
      className=""
    >
      {loading ? (
        <ImSpinner2 className="size-3 animate-spin" />
      ) : (
        <FaPaperPlane className="size-3" />
      )}
      Enviar enlace de verificación
    </Button>
  );
}
