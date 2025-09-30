import React, { useState } from "react"

const SubArea = () => {
    const [billingCycle, setBillingCycle] = useState('yearly')

    const tabBase = "w-[270px] h-[50px] text-[20px] rounded-full text-sm font-medium"
    const tabActive = "bg-[#13008B] text-white"
    const tabInactive = "bg-gray-100 text-gray-700"

    const Feature = ({ children }) => (
        <div className="flex items-start gap-2 text-sm text-black">
            <span className="mt-0.5 h-5 w-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
            <span>{children}</span>
        </div>
    )

    const PlanCards = ({ variant }) => (
        <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free card */}
                <div className="rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-[30px] text-gray-900">Free Forever</h3>
                    <p className="text-[20px] text-gray-600">Best for Beginners</p>
                    <button className="mt-4 w-full border-[1px] border-[#ccc] hover:bg-gray-100 text-gray-800 rounded-md py-2 text-sm">Create an Account</button>
                    <p className="mt-4 text-[16px] text-black text-center">Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown</p>
                    <div className="mt-6 space-y-5">
                        <p className="text-[20px] font-medium text-gray-800">Things Included:</p>
                        <div className="space-y-3">
                            <Feature>Lorem ipsum has</Feature>
                            <Feature>Lorem ipsum has been to</Feature>
                            <Feature>Lorem ipsum has been</Feature>
                            <Feature>Lorem ipsum has been the industry's</Feature>
                        </div>
                    </div>
                </div>

                {/* Pro card */}
                <div className="rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-[30px] text-gray-900">Pro</h3>
                    <p className="text-[20px] text-gray-600">Best For New Businesses</p>
                    <button className="mt-4 w-full border-[1px] border-[#ccc] hover:bg-gray-100 text-gray-800 rounded-md py-2 text-sm">{variant === 'monthly' ? 'Start Monthly Trial' : 'Start Your Free Trial'}</button>
                    <p className="mt-4 text-[16px] text-black text-center">Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown</p>
                    <div className="mt-6 space-y-5">
                        <p className="text-[20px] font-medium text-gray-800">Things Included:</p>
                        <div className="space-y-3">
                            <Feature>Lorem ipsum has</Feature>
                            <Feature>Lorem ipsum has been to</Feature>
                            <Feature>Lorem ipsum has been</Feature>
                            <Feature>Lorem ipsum has been the industry's</Feature>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enterprise card */}
            <div className="mt-8 rounded-2xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 text-[30px]">Enterprises</h3>
                <p className="text-sm text-gray-600 text-[20px]">For Big Businesses that Need Premium Support</p>
                <button className="mt-4 w-full border-[1px] border-[#ccc] hover:bg-gray-100 text-gray-800 rounded-md py-2 text-sm">Contact Support</button>
                <p className="mt-4 text-[12px] text-black text-center">Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown</p>
            </div>
        </>
    )

    return(
        <div className="bg-white w-full h-[85vh] rounded-lg p-8 overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-center text-[30px] text-gray-900 font-semibold">Pricing</h2>
                <div className="mt-4 flex justify-center">
                    <div className="inline-flex gap-2 w-[560px] bg-gray-100 p-1 rounded-full">
                        <button onClick={() => setBillingCycle('yearly')} className={`${tabBase} ${billingCycle==='yearly'?tabActive:tabInactive}`}>Yearly</button>
                        <button onClick={() => setBillingCycle('monthly')} className={`${tabBase} ${billingCycle==='monthly'?tabActive:tabInactive}`}>Monthly</button>
                    </div>
                </div>

                {billingCycle === 'yearly' ? (
                    <PlanCards variant="yearly" />
                ) : (
                    <PlanCards variant="monthly" />
                )}
            </div>
        </div>
    )
}
export default SubArea