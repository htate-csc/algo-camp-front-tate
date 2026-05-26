import { toast } from "sonner"

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toast.success("Success!", {
      description,
    })
  }

  const showErrorToast = (description: string) => {
    toast.error("エラー", {
      description,
    })
  }

  return { showSuccessToast, showErrorToast }
}

export default useCustomToast
