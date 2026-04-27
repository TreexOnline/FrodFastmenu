import { createContext, useContext, useState, ReactNode } from "react";

interface EditingContextType {
  isEditingOrder: boolean;
  setIsEditingOrder: (editing: boolean) => void;
}

const EditingContext = createContext<EditingContextType>({
  isEditingOrder: false,
  setIsEditingOrder: () => {},
});

export function EditingProvider({ children }: { children: ReactNode }) {
  const [isEditingOrder, setIsEditingOrder] = useState(false);

  return (
    <EditingContext.Provider value={{ isEditingOrder, setIsEditingOrder }}>
      {children}
    </EditingContext.Provider>
  );
}

export function useEditing() {
  return useContext(EditingContext);
}
