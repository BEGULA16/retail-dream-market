
import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingInputProps {
  rating: number;
  setRating: (rating: number) => void;
  disabled?: boolean;
}

const StarRatingInput = ({ rating, setRating, disabled = false }: StarRatingInputProps) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'cursor-pointer transition-colors',
            (hoverRating || rating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300',
            disabled ? 'cursor-not-allowed' : ''
          )}
          onClick={() => !disabled && setRating(star)}
          onMouseEnter={() => !disabled && setHoverRating(star)}
          onMouseLeave={() => !disabled && setHoverRating(0)}
        />
      ))}
    </div>
  );
};

export default StarRatingInput;
