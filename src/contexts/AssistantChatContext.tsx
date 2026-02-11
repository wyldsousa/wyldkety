import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const AssistantChatContext = createContext<any>(null);

export const AssistantChatProvider = ({ children }: any) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const safeInvoke = async (functionName: string, body: any) => {
    try {
      const response = await supabase.functions.invoke(functionName, { body });

      if (response?.error) {
        console.warn("Erro da function:", response.error);
        return { error: response.error };
      }

      return { data: response?.data };

    } catch (err) {
      console.warn("Servidor indisponível:", err);
      return { error: err };
    }
  };

  const addMessage = (message: any) => {
    setMessages((prev) => [...prev, message]);
  };

  const sendMessage = async (text: string) => {
    if (!text?.trim()) return;

    const userMessage = {
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    addMessage(userMessage);
    setIsLoading(true);

    const { data, error } = await safeInvoke("financial-assistant", {
      message: text,
    });

    if (error) {
      addMessage({
        role: "assistant",
        content:
          "⚠️ Servidor temporariamente indisponível. Tente novamente mais tarde.",
        status: "error",
      });
      setIsLoading(false);
      return;
    }

    if (data?.message) {
      addMessage({
        role: "assistant",
        content: data.message,
      });
    }

    if (data?.pendingTransaction) {
      setPendingTransaction(data.pendingTransaction);
    }

    setIsLoading(false);
  };

  const confirmTransaction = async () => {
    if (!pendingTransaction) return;

    setIsLoading(true);

    const { error } = await safeInvoke("financial-assistant", {
      confirmTransaction: pendingTransaction,
    });

    if (error) {
      addMessage({
        role: "assistant",
        content:
          "⚠️ Não foi possível confirmar agora. Servidor indisponível.",
        status: "error",
      });
      setIsLoading(false);
      return;
    }

    setPendingTransaction(null);
    setIsLoading(false);
  };

  const cancelTransaction = () => {
    setPendingTransaction(null);
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <AssistantChatContext.Provider
      value={{
        messages,
        pendingTransaction,
        isLoading,
        sendMessage,
        confirmTransaction,
        cancelTransaction,
        clearHistory,
      }}
    >
      {children}
    </AssistantChatContext.Provider>
  );
};

export const useAssistantChat = () => {
  return useContext(AssistantChatContext);
};
