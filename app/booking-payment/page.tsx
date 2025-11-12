// app/booking-payment/page.tsx
import { Suspense } from "react";
import { BookingDetails } from "./booking-payment";

function BookingLoading() {
  return (
    <div className="min-h-screen">
      {/* Header mimicking your design */}
      <div className="h-60 md:h-52 bg-[#F8F9FA] mb-8 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0000FF] mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-700">Loading Booking Details</h2>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main content skeleton */}
          <div className="lg:col-span-3 space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            
            {/* Hotel card skeleton */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>

            {/* Guest form skeleton */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<BookingLoading />}>
        <BookingDetails />
      </Suspense>
    </div>
  );
}