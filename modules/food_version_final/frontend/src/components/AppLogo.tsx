export default function AppLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/manzana.png"
      alt="Food Plan Logo"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}
