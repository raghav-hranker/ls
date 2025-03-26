"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import { toast } from "sonner"

interface RatingProps {
  classId: string;
  initialRating?: number;
  averageRating?: number;
  totalRatings?: number;
  onRatingSubmit?: (classId: string, rating: number) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

export function Rating({
  classId,
  initialRating = 0,
  averageRating,
  totalRatings = 0,
  onRatingSubmit,
  className,
  disabled = false,
}: RatingProps) {
  const [rating, setRating] = useState<number>(initialRating);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasRated, setHasRated] = useState<boolean>(initialRating > 0);
  const [showThankYou, setShowThankYou] = useState<boolean>(false);
  const [showButton, setShowButton] = useState<boolean>(true);

  const handleRatingClick = (selectedRating: number) => {
    if (disabled || hasRated) return;
    setRating(selectedRating);
  };

  const handleRatingHover = (hoveredRating: number) => {
    if (disabled || hasRated) return;
    setHoveredRating(hoveredRating);
  };

  const handleSubmitRating = async () => {
    if (disabled || !rating || hasRated || !onRatingSubmit) return;

    try {
      setIsSubmitting(true);
      await onRatingSubmit(classId, rating);
      setHasRated(true);
      setShowThankYou(true);

      // Set a timeout to hide the button after submission
      setTimeout(() => {
        setShowButton(false);
      }, 2000); // Hide button after 2 seconds

      //   toast({
      //     title: "Rating submitted",
      //     description: `You rated this stream ${rating} stars.`,
      //   })
    } catch (error) {
      console.error("Failed to submit rating:", error);
      //   toast({
      //     title: "Failed to submit rating",
      //     description: "Please try again later.",
      //     variant: "destructive",
      //   })
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("tw-w-full tw-max-w-sm", className)}>
      <CardHeader>
        <CardTitle>
            {rating > 0 ?'Class Rating' :'Rate this stream'}
        </CardTitle>
        {averageRating && (
          <CardDescription>
            Average rating: {averageRating.toFixed(1)} ({totalRatings}{" "}
            {totalRatings === 1 ? "rating" : "ratings"})
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="tw-flex tw-justify-center tw-space-x-1"
          onMouseLeave={() => setHoveredRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "tw-h-8 tw-w-8 tw-cursor-pointer tw-transition-all",
                hoveredRating >= star || (!hoveredRating && rating >= star)
                  ? "tw-fill-yellow-400 tw-text-yellow-400"
                  : "tw-fill-white tw-text-muted-foreground",
                disabled || hasRated ? "tw-cursor-default tw-opacity-80" : ""
              )}
              onClick={() => handleRatingClick(star)}
              onMouseEnter={() => handleRatingHover(star)}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter className="tw-flex tw-justify-center">
        {showButton ? (
          <Button
            onClick={handleSubmitRating}
            disabled={
              disabled || !rating || (hasRated && !showThankYou) || isSubmitting
            }
          >
            {isSubmitting
              ? "Submitting..."
              : hasRated && showThankYou
              ? "Thank you!"
              : "Submit Rating"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
