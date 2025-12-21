import Link from "next/link";
import Image from "next/image";

interface Product {
  id: number;
  title: string;
  status: string;
  features: string[];
  icon: string;
  path?: string;
  buttonText?: string;
  banner?: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const isAvailable = product.status === "已支持";
  const buttonText = product.buttonText || (isAvailable ? "立即使用" : "即将开放");
  const buttonClassName = "w-full px-4 py-2 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow border border-gray-200">
      {product.banner && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <Image
            src={product.banner}
            alt={product.title}
            width={400}
            height={200}
            className="w-full h-auto object-cover"
          />
        </div>
      )}
      <div className="text-4xl mb-4">{product.icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{product.title}</h3>
      <span
        className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${
          isAvailable
            ? "bg-green-100 text-green-800"
            : "bg-amber-100 text-amber-800"
        }`}
      >
        {product.status}
      </span>

      <ul className="space-y-2 mb-6">
        {product.features.map((feature, idx) => (
          <li key={idx} className="flex items-start text-sm text-gray-600">
            <span className="mr-2">•</span>
            {feature}
          </li>
        ))}
      </ul>

      {product.path ? (
        <Link href={product.path} className={`${buttonClassName} block text-center`}>
          {buttonText}
        </Link>
      ) : (
        <button
          className={buttonClassName}
          disabled={!isAvailable}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}

