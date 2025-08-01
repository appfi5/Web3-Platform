interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

export function StatsCard({ label, value, change, isPositive = true }: StatsCardProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white">{value}</span>
        {change && (
          <span className={`${isPositive ? 'text-green-400' : 'text-red-400'} text-sm`}>
            {isPositive ? '+' : ''}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
