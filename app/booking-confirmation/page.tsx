import { BookingConfirmation } from "./booking-confirmation";
import { Suspense } from "react";
import { MapPin, Calendar, Users, Home } from "lucide-react";

function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-white">
      {/* Progress Bar Skeleton */}
      <div className="h-52 bg-[#F8F9FA] mb-8 flex flex-col gap-12 p-6">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
              <div className="ml-2 w-24 h-3 bg-gray-300 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="max-w-xl w-full mx-auto flex items-center justify-between relative">
          <div className="h-[1px] w-4/5 flex justify-center left-8 bg-gray-200 absolute top-5 z-0"></div>
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center flex-col gap-2">
              <div className="w-10 h-10 bg-gray-300 z-10 rounded-full animate-pulse"></div>
              <div className="w-20 h-3 bg-gray-300 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Confirmation Header Skeleton */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="flex flex-col items-start space-y-2">
              <div className="w-48 h-4 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-32 h-6 bg-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Hotel Card Skeleton */}
        <div className="border border-[#E6E6E6] rounded-lg p-6 animate-pulse">
          <div className="w-3/4 h-6 bg-gray-300 rounded mb-2"></div>
          <div className="w-16 h-4 bg-gray-300 rounded mb-4"></div>
          <div className="flex items-center mb-6">
            <MapPin className="w-4 h-4 text-gray-300 mr-2" />
            <div className="w-1/2 h-4 bg-gray-300 rounded"></div>
          </div>

          {/* Room Skeleton */}
          <div className="space-y-4">
            {[1, 2].map((room) => (
              <div key={room} className="border border-[#E6E6E6] rounded-lg p-4 bg-[#FAFBFC]">
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-2">
                    <div className="w-48 h-5 bg-gray-300 rounded"></div>
                    <div className="w-32 h-3 bg-gray-300 rounded"></div>
                  </div>
                  <div className="w-16 h-4 bg-gray-300 rounded"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
                      <div className="w-20 h-3 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Booking Details Grid Skeleton */}
          <div className="grid grid-cols-5 gap-4 mt-6 p-6 rounded-lg bg-[#F8F9FA]">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="text-center">
                <div className="w-12 h-4 bg-gray-300 rounded mx-auto mb-1"></div>
                <div className="w-16 h-3 bg-gray-300 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Information Skeleton */}
        <div className="border border-[#E6E6E6] rounded-lg p-6 animate-pulse">
          <div className="w-24 h-5 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2].map((room) => (
              <div key={room}>
                <div className="mb-3">
                  <div className="w-32 h-4 bg-gray-300 rounded mb-1"></div>
                  <div className="w-24 h-3 bg-gray-300 rounded"></div>
                </div>
                <div className="space-y-3 ml-4">
                  {[1, 2].map((guest) => (
                    <div key={guest} className="space-y-1">
                      <div className="w-16 h-3 bg-gray-300 rounded"></div>
                      <div className="w-40 h-4 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
                {room < 2 && <hr className="my-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Skeleton */}
        <div className="border border-[#E6E6E6] rounded-lg p-6 animate-pulse">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex justify-between">
                <div className="w-24 h-4 bg-gray-300 rounded"></div>
                <div className="w-16 h-4 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Button Skeleton */}
        <div className="w-full h-12 bg-gray-300 rounded-lg animate-pulse"></div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<SkeletonLoader />}>
        <BookingConfirmation />
      </Suspense>
    </div>
  );
}