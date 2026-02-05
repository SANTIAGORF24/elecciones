import { Loader2, Vote } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-[#11357b] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Vote className="w-8 h-8 text-white animate-pulse" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-[#11357b] mx-auto" />
      </div>
    </div>
  )
}
