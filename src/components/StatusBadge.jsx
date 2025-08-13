export default function StatusBadge({ status }) {
  const color =
    status === "ok" ? "bg-green-500" :
    status === "near-end" ? "bg-yellow-500" :
    status === "out" ? "bg-red-500" :
    "bg-gray-400"
  const label = status || "unknown"
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full text-white ${color}`}>
      Paper Status: {label}
    </span>
  )
}