import React, { useState, useRef, useEffect } from "react";

const OverviewIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    const gradientId = `paint0_linear_470_109${isActive ? '_active' : ''}`;
    return (
        <svg
            width="58"
            height="58"
            viewBox="0 0 58 58"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M12.0833 7.25V45.9167H50.75V50.75H7.25V7.25H12.0833ZM49.0412 15.2078L52.4588 18.6255L38.6667 32.4177L31.4167 25.1696L21.0422 35.5422L17.6245 32.1245L31.4167 18.3323L38.6667 25.5804L49.0412 15.2078Z"
                fill={`url(#${gradientId})`}
            />
            <defs>
                <linearGradient
                    id={gradientId}
                    x1="29.8544"
                    y1="7.25"
                    x2="29.8544"
                    y2="50.75"
                    gradientUnits="userSpaceOnUse"
                >
                    {isActive ? (
                        <>
                            <stop stopColor="#F0C33A" />
                            <stop offset="1" stopColor="#D4A028" />
                        </>
                    ) : (
                        <>
                            <stop stopColor="white" />
                            <stop offset="1" stopColor="#999999" />
                        </>
                    )}
                </linearGradient>
            </defs>
        </svg>
    );
};

const BankIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    const gradientId = `paint0_linear_470_112${isActive ? '_active' : ''}`;
    return (
        <svg
            width="58"
            height="58"
            viewBox="0 0 58 58"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M5 48.499H53.3333V53.3324H5V48.499ZM9.83333 29.1657H14.6667V46.0824H9.83333V29.1657ZM21.9167 29.1657H26.75V46.0824H21.9167V29.1657ZM31.5833 29.1657H36.4167V46.0824H31.5833V29.1657ZM43.6667 29.1657H48.5V46.0824H43.6667V29.1657ZM5 17.0824L29.1667 4.99902L53.3333 17.0824V26.749H5V17.0824ZM29.1667 19.499C30.5014 19.499 31.5833 18.417 31.5833 17.0824C31.5833 15.7477 30.5014 14.6657 29.1667 14.6657C27.8319 14.6657 26.75 15.7477 26.75 17.0824C26.75 18.417 27.8319 19.499 29.1667 19.499Z"
                fill={`url(#${gradientId})`}
            />
            <defs>
                <linearGradient
                    id={gradientId}
                    x1="29.1667"
                    y1="4.99902"
                    x2="29.1667"
                    y2="53.3324"
                    gradientUnits="userSpaceOnUse"
                >
                    {isActive ? (
                        <>
                            <stop stopColor="#F0C33A" />
                            <stop offset="1" stopColor="#D4A028" />
                        </>
                    ) : (
                        <>
                            <stop stopColor="white" />
                            <stop offset="1" stopColor="#999999" />
                        </>
                    )}
                </linearGradient>
            </defs>
        </svg>
    );
};

const FixedDepositIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    const gradientId = `paint0_linear_470_115${isActive ? '_active' : ''}`;
    return (
        <svg
            width="58"
            height="58"
            viewBox="0 0 58 58"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M4.8335 28.9997H9.66683V50.7497H4.8335V28.9997ZM12.0835 33.833H16.9168V50.7497H12.0835V33.833ZM38.6668 19.333H43.5002V50.7497H38.6668V19.333ZM45.9168 24.1663H50.7502V50.7497H45.9168V24.1663ZM21.7502 4.83301H26.5835V50.7497H21.7502V4.83301ZM29.0002 9.66634H33.8335V50.7497H29.0002V9.66634Z"
                fill={`url(#${gradientId})`}
            />
            <defs>
                <linearGradient
                    id={gradientId}
                    x1="27.7918"
                    y1="4.83301"
                    x2="27.7918"
                    y2="50.7497"
                    gradientUnits="userSpaceOnUse"
                >
                    {isActive ? (
                        <>
                            <stop stopColor="#F0C33A" />
                            <stop offset="1" stopColor="#D4A028" />
                        </>
                    ) : (
                        <>
                            <stop stopColor="white" />
                            <stop offset="1" stopColor="#999999" />
                        </>
                    )}
                </linearGradient>
            </defs>
        </svg>
    );
};

const NFTIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    const gradientId = `paint0_linear_470_91${isActive ? '_active' : ''}`;
    return (
        <svg
            width="58"
            height="58"
            viewBox="0 0 58 58"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M21.7498 29.0003C24.4193 29.0003 26.5832 26.8364 26.5832 24.167C26.5832 21.4976 24.4193 19.3337 21.7498 19.3337C19.0805 19.3337 16.9165 21.4976 16.9165 24.167C16.9165 26.8364 19.0805 29.0003 21.7498 29.0003ZM51.9582 15.7087L28.9998 2.41699L6.0415 15.7087V42.292L28.9998 55.5837L51.9582 42.292V15.7087ZM28.9998 8.00191L47.1248 18.4953V35.1237L36.0998 28.5088L16.836 42.9566L10.8748 39.5053V18.4953L28.9998 8.00191ZM28.9998 49.9987L21.3822 45.5886L36.3999 34.3252L46.0603 40.1216L28.9998 49.9987Z"
                fill={`url(#${gradientId})`}
            />
            <defs>
                <linearGradient
                    id={gradientId}
                    x1="28.9998"
                    y1="2.41699"
                    x2="28.9998"
                    y2="55.5837"
                    gradientUnits="userSpaceOnUse"
                >
                    {isActive ? (
                        <>
                            <stop stopColor="#F0C33A" />
                            <stop offset="1" stopColor="#D4A028" />
                        </>
                    ) : (
                        <>
                            <stop stopColor="white" />
                            <stop offset="1" stopColor="#999999" />
                        </>
                    )}
                </linearGradient>
            </defs>
        </svg>
    );
};

// Reusable Number Pad Component
interface NumberPadProps {
    amount: string;
    onNumberClick: (num: string) => void;
    onDelete: () => void;
    onDeposit?: () => void;
    placeholder?: string;
}

const NumberPad: React.FC<NumberPadProps> = ({ amount, onNumberClick, onDelete, onDeposit, placeholder = "Enter Amount" }) => (
    <>
        {/* Input with inline Deposit button */}
        <div className="flex gap-2 mb-2">
            <input
                type="text"
                value={amount}
                readOnly
                placeholder={placeholder}
                className="flex-1 bg-neutral-900 text-white font-pixeloid text-lg px-2 py-3 rounded-xl text-center placeholder-gray-500"
            />
            <button
                onClick={onDeposit}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-pixeloid px-4 py-3 rounded-xl transition-all outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] flex items-center gap-2"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L12 22M12 2L8 6M12 2L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Deposit
            </button>
        </div>
        
        {/* Number Grid */}
        <div className="grid grid-cols-3 gap-2 mb-2">
            {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                <button
                    key={num}
                    onClick={() => onNumberClick(num.toString())}
                    className="bg-neutral-900 hover:bg-neutral-800 outline-none focus:outline-none hover:border-none border-none text-white font-pixeloid text-xl py-3 rounded-xl transition-all hover:scale-[1.02]"
                >
                    {num}
                </button>
            ))}
        </div>
        
        {/* Bottom Row: Empty space, 0 centered, and Delete */}
        <div className="grid grid-cols-3 gap-2">
            <div></div>
            <button
                onClick={() => onNumberClick("0")}
                className="bg-neutral-900 hover:bg-neutral-800 outline-none focus:outline-none hover:border-none border-none text-white font-pixeloid text-xl py-3 rounded-xl transition-all hover:scale-[1.02]"
            >
                0
            </button>
            <button
                onClick={onDelete}
                className="bg-red-700/50 text-xl hover:bg-red-700/80 text-white font-pixeloid outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.53451 3H20.9993C21.5516 3 21.9993 3.44772 21.9993 4V20C21.9993 20.5523 21.5516 21 20.9993 21H6.53451C6.20015 21 5.88792 20.8329 5.70246 20.5547L0.369122 12.5547C0.145189 12.2188 0.145189 11.7812 0.369122 11.4453L5.70246 3.4453C5.88792 3.1671 6.20015 3 6.53451 3ZM7.06969 5L2.40302 12L7.06969 19H19.9993V5H7.06969ZM12.9993 10.5858L15.8277 7.75736L17.242 9.17157L14.4135 12L17.242 14.8284L15.8277 16.2426L12.9993 13.4142L10.1709 16.2426L8.75668 14.8284L11.5851 12L8.75668 9.17157L10.1709 7.75736L12.9993 10.5858Z" fill="white"/>
                </svg>
                Delete
            </button>
        </div>
    </>
);

const ButtonBackgroundSVG: React.FC<{ id: string }> = ({ id }) => (
    <svg
        className="absolute inset-0 w-full h-full"
        width="359"
        height="90"
        viewBox="0 0 359 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
    >
        <mask id={`path-1-inside-1_${id}`} fill="white">
            <path d="M359 0.000976562H343V4.01953H359V4.02051H351V8.03906H359V80.3535H351V84.9082H359V84.9102H343V89.4629H16V84.9102H0V84.9082H8V80.3535H0V8.03906H8V4.02051H0V4.01953H16V0.000976562H0V0H359V0.000976562Z" />
        </mask>
        <path
            d="M359 0.000976562H343V4.01953H359V4.02051H351V8.03906H359V80.3535H351V84.9082H359V84.9102H343V89.4629H16V84.9102H0V84.9082H8V80.3535H0V8.03906H8V4.02051H0V4.01953H16V0.000976562H0V0H359V0.000976562Z"
            fill="#F0C33A"
        />
        <path
            d="M359 0.000976562V8.00098H367V0.000976562H359ZM343 0.000976562V-7.99902H335V0.000976562H343ZM343 4.01953H335V12.0195H343V4.01953ZM359 4.01953H367V-3.98047H359V4.01953ZM359 4.02051V12.0205H367V4.02051H359ZM351 4.02051V-3.97949H343V4.02051H351ZM351 8.03906H343V16.0391H351V8.03906ZM359 8.03906H367V0.0390625H359V8.03906ZM359 80.3535V88.3535H367V80.3535H359ZM351 80.3535V72.3535H343V80.3535H351ZM351 84.9082H343V92.9082H351V84.9082ZM359 84.9082H367V76.9082H359V84.9082ZM359 84.9102V92.9102H367V84.9102H359ZM343 84.9102V76.9102H335V84.9102H343ZM343 89.4629V97.4629H351V89.4629H343ZM16 89.4629H8V97.4629H16V89.4629ZM16 84.9102H24V76.9102H16V84.9102ZM0 84.9102H-8V92.9102H0V84.9102ZM0 84.9082V76.9082H-8V84.9082H0ZM8 84.9082V92.9082H16V84.9082H8ZM8 80.3535H16V72.3535H8V80.3535ZM0 80.3535H-8V88.3535H0V80.3535ZM0 8.03906V0.0390625H-8V8.03906H0ZM8 8.03906V16.0391H16V8.03906H8ZM8 4.02051H16V-3.97949H8V4.02051ZM0 4.02051H-8V12.0205H0V4.02051ZM0 4.01953V-3.98047H-8V4.01953H0ZM16 4.01953V12.0195H24V4.01953H16ZM16 0.000976562H24V-7.99902H16V0.000976562ZM0 0.000976562H-8V8.00098H0V0.000976562ZM0 0V-8H-8V0H0ZM359 0H367V-8H359V0ZM359 0.000976562V-7.99902H343V0.000976562V8.00098H359V0.000976562ZM343 0.000976562H335V4.01953H343H351V0.000976562H343ZM343 4.01953V12.0195H359V4.01953V-3.98047H343V4.01953ZM359 4.01953H351V4.02051H359H367V4.01953H359ZM359 4.02051V-3.97949H351V4.02051V12.0205H359V4.02051ZM351 4.02051H343V8.03906H351H359V4.02051H351ZM351 8.03906V16.0391H359V8.03906V0.0390625H351V8.03906ZM359 8.03906H351V80.3535H359H367V8.03906H359ZM359 80.3535V72.3535H351V80.3535V88.3535H359V80.3535ZM351 80.3535H343V84.9082H351H359V80.3535H351ZM351 84.9082V92.9082H359V84.9082V76.9082H351V84.9082ZM359 84.9082H351V84.9102H359H367V84.9082H359ZM359 84.9102V76.9102H343V84.9102V92.9102H359V84.9102ZM343 84.9102H335V89.4629H343H351V84.9102H343ZM343 89.4629V81.4629H16V89.4629V97.4629H343V89.4629ZM16 89.4629H24V84.9102H16H8V89.4629H16ZM16 84.9102V76.9102H0V84.9102V92.9102H16V84.9102ZM0 84.9102H8V84.9082H0H-8V84.9102H0ZM0 84.9082V92.9082H8V84.9082V76.9082H0V84.9082ZM8 84.9082H16V80.3535H8H0V84.9082H8ZM8 80.3535V72.3535H0V80.3535V88.3535H8V80.3535ZM0 80.3535H8V8.03906H0H-8V80.3535H0ZM0 8.03906V16.0391H8V8.03906V0.0390625H0V8.03906ZM8 8.03906H16V4.02051H8H0V8.03906H8ZM8 4.02051V-3.97949H0V4.02051V12.0205H8V4.02051ZM0 4.02051H8V4.01953H0H-8V4.02051H0ZM0 4.01953V12.0195H16V4.01953V-3.98047H0V4.01953ZM16 4.01953H24V0.000976562H16H8V4.01953H16ZM16 0.000976562V-7.99902H0V0.000976562V8.00098H16V0.000976562ZM0 0.000976562H8V0H0H-8V0.000976562H0ZM0 0V8H359V0V-8H0V0ZM359 0H351V0.000976562H359H367V0H359Z"
            fill="black"
            mask={`url(#path-1-inside-1_${id})`}
        />
        <mask id={`path-3-inside-2_${id}`} fill="white">
            <path d="M351 3.75195H335.713V7.40918H343.356V11.0674H351V76.8857H343.356V81.0312H351V81.0342H335.713V85.1787H23.2871V81.0342H8V81.0312H15.6436V76.8857H8V11.0674H15.6436V7.40918H23.2871V3.75195H8H351Z" />
        </mask>
        <path
            d="M335.713 3.75195V-4.24805H327.713V3.75195H335.713ZM335.713 7.40918H327.713V15.4092H335.713V7.40918ZM343.356 7.40918H351.356V-0.59082H343.356V7.40918ZM343.356 11.0674H335.356V19.0674H343.356V11.0674ZM351 11.0674H359V3.06738H351V11.0674ZM351 76.8857V84.8857H359V76.8857H351ZM343.356 76.8857V68.8857H335.356V76.8857H343.356ZM343.356 81.0312H335.356V89.0312H343.356V81.0312ZM351 81.0312H359V73.0312H351V81.0312ZM351 81.0342V89.0342H359V81.0342H351ZM335.713 81.0342V73.0342H327.713V81.0342H335.713ZM335.713 85.1787V93.1787H343.713V85.1787H335.713ZM23.2871 85.1787H15.2871V93.1787H23.2871V85.1787ZM23.2871 81.0342H31.2871V73.0342H23.2871V81.0342ZM8 81.0342H0V89.0342H8V81.0342ZM8 81.0312V73.0312H0V81.0312H8ZM15.6436 81.0312V89.0312H23.6436V81.0312H15.6436ZM15.6436 76.8857H23.6436V68.8857H15.6436V76.8857ZM8 76.8857H0V84.8857H8V76.8857ZM8 11.0674V3.06738H0V11.0674H8ZM15.6436 11.0674V19.0674H23.6436V11.0674H15.6436ZM15.6436 7.40918V-0.59082H7.64355V7.40918H15.6436ZM23.2871 7.40918V15.4092H31.2871V7.40918H23.2871ZM23.2871 3.75195H31.2871V-4.24805H23.2871V3.75195ZM351 3.75195V-4.24805H335.713V3.75195V11.752H351V3.75195ZM335.713 3.75195H327.713V7.40918H335.713H343.713V3.75195H335.713ZM335.713 7.40918V15.4092H343.356V7.40918V-0.59082H335.713V7.40918ZM343.356 7.40918H335.356V11.0674H343.356H351.356V7.40918H343.356ZM343.356 11.0674V19.0674H351V11.0674V3.06738H343.356V11.0674ZM351 11.0674H343V76.8857H351H359V11.0674H351ZM351 76.8857V68.8857H343.356V76.8857V84.8857H351V76.8857ZM343.356 76.8857H335.356V81.0312H343.356H351.356V76.8857H343.356ZM343.356 81.0312V89.0312H351V81.0312V73.0312H343.356V81.0312ZM351 81.0312H343V81.0342H351H359V81.0312H351ZM351 81.0342V73.0342H335.713V81.0342V89.0342H351V81.0342ZM335.713 81.0342H327.713V85.1787H335.713H343.713V81.0342H335.713ZM335.713 85.1787V77.1787H23.2871V85.1787V93.1787H335.713V85.1787ZM23.2871 85.1787H31.2871V81.0342H23.2871H15.2871V85.1787H23.2871ZM23.2871 81.0342V73.0342H8V81.0342V89.0342H23.2871V81.0342ZM8 81.0342H16V81.0312H8H0V81.0342H8ZM8 81.0312V89.0312H15.6436V81.0312V73.0312H8V81.0312ZM15.6436 81.0312H23.6436V76.8857H15.6436H7.64355V81.0312H15.6436ZM15.6436 76.8857V68.8857H8V76.8857V84.8857H15.6436V76.8857ZM8 76.8857H16V11.0674H8H0V76.8857H8ZM8 11.0674V19.0674H15.6436V11.0674V3.06738H8V11.0674ZM15.6436 11.0674H23.6436V7.40918H15.6436H7.64355V11.0674H15.6436ZM15.6436 7.40918V15.4092H23.2871V7.40918V-0.59082H15.6436V7.40918ZM23.2871 7.40918H31.2871V3.75195H23.2871H15.2871V7.40918H23.2871ZM23.2871 3.75195V-4.24805H8V3.75195V11.752H23.2871V3.75195ZM8 3.75195V11.752H351V3.75195V-4.24805H8V3.75195Z"
            fill="white"
            fillOpacity="0.25"
            mask={`url(#path-3-inside-2_${id})`}
        />
    </svg>
);

// Reusable Tab Button Component
interface TabButtonProps {
    icon: React.ReactElement<{ isActive?: boolean }>;
    label: string;
    onClick: () => void;
    isCompact?: boolean;
    isActive?: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, onClick, isCompact = false, isActive = false }) => (
    <div className="flex flex-col items-center cursor-pointer select-none">
        <button
            onClick={onClick}
            className="relative flex flex-col items-center gap-1 transition-all hover:scale-[1.02] focus:outline-0 outline-0 hover:border-none border-none overflow-hidden"
            style={{ background: "transparent" }}
        >
            <TabBackgroundSVG isActive={isActive} />
            <div className={`relative z-10 ${isCompact ? 'p-2' : 'p-8'}`}>
                {React.cloneElement(icon, { isActive } as { isActive: boolean })}
            </div>
        </button>
        <span className={`text-white font-pixeloid relative z-10 ${isCompact ? 'text-sm' : 'text-xl'}`}>
            {label}
        </span>
    </div>
);

// Reusable Tab Navigation Background SVG Component
const TabBackgroundSVG: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => (
    <svg
        className="absolute inset-0 w-full h-full"
        width="172"
        height="113"
        viewBox="0 0 172 113"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
    >
        <mask id="path-1-inside-1_367_191" fill="white">
            <path d="M163.18 4.81836L166.616 4.81836V9.30078L171.781 9.30078L171.781 105.616H166.633V108.972L163.195 108.972V112.323L8.58984 112.323L8.58984 108.972H5.17188V105.605H0L0 9.30078L5.14844 9.30078L5.14844 4.8252L8.58887 4.8252L8.58887 0.339844L163.18 0.339844V4.81836ZM171.781 1.46094H171.769V0.339844H171.781V1.46094Z" />
        </mask>
        <path
            d="M163.18 4.81836L166.616 4.81836V9.30078L171.781 9.30078L171.781 105.616H166.633V108.972L163.195 108.972V112.323L8.58984 112.323L8.58984 108.972H5.17188V105.605H0L0 9.30078L5.14844 9.30078L5.14844 4.8252L8.58887 4.8252L8.58887 0.339844L163.18 0.339844V4.81836ZM171.781 1.46094H171.769V0.339844H171.781V1.46094Z"
            fill="url(#paint0_linear_367_191)"
        />
        <path
            d="M163.18 4.81836L158.618 4.81836V9.38003L163.18 9.38003V4.81836ZM166.616 4.81836L171.178 4.81836V0.256693L166.616 0.256693V4.81836ZM166.616 9.30078H162.055V13.8624H166.616V9.30078ZM171.781 9.30078H176.343V4.73912L171.781 4.73912V9.30078ZM171.781 105.616V110.178H176.343V105.616H171.781ZM166.633 105.616V101.055L162.071 101.055V105.616L166.633 105.616ZM166.633 108.972V113.533H171.194V108.972H166.633ZM163.195 108.972V104.41H158.634V108.972H163.195ZM163.195 112.323V116.885L167.757 116.885V112.323L163.195 112.323ZM8.58984 112.323H4.02818L4.02818 116.885H8.58984V112.323ZM8.58984 108.972H13.1515V104.41H8.58984V108.972ZM5.17188 108.972H0.610209L0.610209 113.533H5.17188L5.17188 108.972ZM5.17188 105.605H9.73354L9.73354 101.044H5.17188L5.17188 105.605ZM0 105.605H-4.56167L-4.56167 110.167H0L0 105.605ZM0 9.30078L0 4.73912L-4.56167 4.73912L-4.56167 9.30078L0 9.30078ZM5.14844 9.30078L5.14844 13.8624H9.7101L9.7101 9.30078H5.14844ZM5.14844 4.8252L5.14844 0.263529L0.586771 0.263529L0.586771 4.8252L5.14844 4.8252ZM8.58887 4.8252V9.38686L13.1505 9.38686V4.8252L8.58887 4.8252ZM8.58887 0.339844L8.58887 -4.22182L4.0272 -4.22182L4.0272 0.339844L8.58887 0.339844ZM163.18 0.339844L167.741 0.339844V-4.22182L163.18 -4.22182V0.339844ZM171.781 1.46094V6.0226L176.343 6.0226V1.46094L171.781 1.46094ZM171.769 1.46094L167.207 1.46094V6.0226L171.769 6.0226V1.46094ZM171.769 0.339844V-4.22182L167.207 -4.22182V0.339844L171.769 0.339844ZM171.781 0.339844L176.343 0.339844V-4.22182L171.781 -4.22182V0.339844ZM163.18 4.81836V9.38003H166.616V4.81836V0.256693L163.18 0.256693V4.81836ZM166.616 4.81836L162.055 4.81836V9.30078H166.616L171.178 9.30078V4.81836L166.616 4.81836ZM166.616 9.30078V13.8624L171.781 13.8624V9.30078V4.73912L166.616 4.73912V9.30078ZM171.781 9.30078L167.22 9.30078L167.22 105.616H171.781H176.343L176.343 9.30078H171.781ZM171.781 105.616V101.055H166.633V105.616V110.178H171.781V105.616ZM166.633 105.616L162.071 105.616V108.972L166.633 108.972H171.194V105.616H166.633ZM166.633 108.972V104.41L163.195 104.41V108.972V113.533L166.633 113.533V108.972ZM163.195 108.972H158.634V112.323H163.195L167.757 112.323V108.972L163.195 108.972ZM163.195 112.323V107.762L8.58984 107.762L8.58984 112.323V116.885L163.195 116.885V112.323ZM8.58984 112.323H13.1515L13.1515 108.972H8.58984H4.02818L4.02818 112.323H8.58984ZM8.58984 108.972V104.41H5.17188L5.17188 108.972L5.17188 113.533H8.58984L8.58984 108.972ZM5.17188 108.972H9.73354V105.605H5.17188H0.610209L0.610209 108.972H5.17188ZM5.17188 105.605L5.17188 101.044H0L0 105.605L0 110.167H5.17188L5.17188 105.605ZM0 105.605H4.56167L4.56167 9.30078L0 9.30078L-4.56167 9.30078L-4.56167 105.605H0ZM0 9.30078L0 13.8624L5.14844 13.8624L5.14844 9.30078L5.14844 4.73912L0 4.73912L0 9.30078ZM5.14844 9.30078H9.7101V4.8252L5.14844 4.8252L0.586771 4.8252L0.586771 9.30078L5.14844 9.30078ZM5.14844 4.8252L5.14844 9.38686H8.58887V4.8252L8.58887 0.263529L5.14844 0.263529L5.14844 4.8252ZM8.58887 4.8252L13.1505 4.8252L13.1505 0.339844L8.58887 0.339844L4.0272 0.339844L4.0272 4.8252L8.58887 4.8252ZM8.58887 0.339844L8.58887 4.90151L163.18 4.90151V0.339844V-4.22182L8.58887 -4.22182L8.58887 0.339844ZM163.18 0.339844L158.618 0.339844V4.81836L163.18 4.81836L167.741 4.81836V0.339844L163.18 0.339844ZM171.781 1.46094V-3.10073H171.769V1.46094V6.0226H171.781V1.46094ZM171.769 1.46094L176.33 1.46094V0.339844L171.769 0.339844L167.207 0.339844V1.46094L171.769 1.46094ZM171.769 0.339844V4.90151H171.781V0.339844V-4.22182H171.769V0.339844ZM171.781 0.339844L167.22 0.339844V1.46094L171.781 1.46094L176.343 1.46094V0.339844L171.781 0.339844Z"
            fill={isActive ? "url(#paint1_linear_active)" : "url(#paint1_linear_367_191)"}
            mask="url(#path-1-inside-1_367_191)"
        />
        <defs>
            <linearGradient
                id="paint0_linear_367_191"
                x1="85.8906"
                y1="112.323"
                x2="85.8906"
                y2="0.339844"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="#3C3C3C" />
                <stop offset="1" stop-color="#212121" />
            </linearGradient>
            <linearGradient
                id="paint1_linear_367_191"
                x1="85.8906"
                y1="0.339844"
                x2="85.8906"
                y2="112.323"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="white" />
                <stop offset="1" stop-color="#9E9E9E" />
            </linearGradient>
            <linearGradient
                id="paint1_linear_active"
                x1="85.8906"
                y1="0.339844"
                x2="85.8906"
                y2="112.323"
                gradientUnits="userSpaceOnUse"
            >
                <stop stop-color="#F0C33A" />
                <stop offset="1" stop-color="#D4A028" />
            </linearGradient>
        </defs>
    </svg>
);

interface TestBankDashboardProps {
    onClose?: () => void;
}

const TestBankDashboard: React.FC<TestBankDashboardProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [amount, setAmount] = useState("");
    const [transactionType, setTransactionType] = useState<"deposit" | "withdraw">("deposit");
    const [scrollY, setScrollY] = useState(0);
    const [transactionScrollY, setTransactionScrollY] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const transactionBoxRef = useRef<HTMLDivElement>(null);
    
    // Fixed Deposit state
    const [fdAmount, setFdAmount] = useState("");
    const [selectedTerm, setSelectedTerm] = useState("6M");

    const tabButtons = [
        { id: "overview", icon: <OverviewIcon />, label: "Overview" },
        { id: "bank", icon: <BankIcon />, label: "Bank" },
        {
            id: "fixed-deposit",
            icon: <FixedDepositIcon />,
            label: "Fixed Deposit",
        },
        { id: "nft", icon: <NFTIcon />, label: "NFT" },
    ];

    // Mock data
    const bankMockData = {
        userName: "Jashanjot Singh",
        accountNumber: "DIN-006909",
        transactions: [
            {
                id: 1,
                type: "Received From",
                from: "M.A.Y.A.",
                date: "12/02/2025",
                amount: 2000,
                isPositive: true,
            }
        ],
    };

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            window.history.back();
        }
    };

    const handleNumberClick = (num: string) => {
        if (activeTab === "fixed-deposit") {
            setFdAmount(prev => prev + num);
        } else {
            setAmount(prev => prev + num);
        }
    };

    const handleDelete = () => {
        if (activeTab === "fixed-deposit") {
            setFdAmount(prev => prev.slice(0, -1));
        } else {
            setAmount(prev => prev.slice(0, -1));
        }
    };

    const handleDeposit = () => {
        if (amount) {
            console.log("Deposit amount:", amount);
            // Add deposit logic here
            setAmount("");
        }
    };

    const handleFdDeposit = () => {
        if (fdAmount) {
            console.log("FD Deposit amount:", fdAmount, "term:", selectedTerm);
            // Add FD deposit logic here
            setFdAmount("");
        }
    };

    const handleWithdraw = () => {
        if (amount) {
            console.log("Withdraw amount:", amount);
            // Add withdraw logic here
            setAmount("");
        }
    };

    // Handle scroll
    useEffect(() => {
        const handleScroll = () => {
            if (scrollContainerRef.current) {
                setScrollY(scrollContainerRef.current.scrollTop);
            }
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener("scroll", handleScroll);
            return () => container.removeEventListener("scroll", handleScroll);
        }
    }, []);

    // Track transaction box position relative to viewport
    useEffect(() => {
        const handleMainScroll = () => {
            if (scrollContainerRef.current && transactionBoxRef.current) {
                const mainScrollTop = scrollContainerRef.current.scrollTop;
                const transactionBoxTop = transactionBoxRef.current.offsetTop;
                // Calculate how far the transaction box has scrolled up
                const scrollDistance = Math.max(0, mainScrollTop - transactionBoxTop + 600);
                setTransactionScrollY(scrollDistance);
            }
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener("scroll", handleMainScroll);
            return () => container.removeEventListener("scroll", handleMainScroll);
        }
    }, []);

    // Calculate transform for elements - scroll naturally for first 10px
    const scrollThreshold = 10;
    const contentTransform = Math.min(scrollY, scrollThreshold); // Content moves max 10px then stops

    // Calculate dynamic opacity for transaction container
    // Starts at 0.6 opacity, gradually becomes fully opaque (1.0) as it scrolls up
    const maxScrollForOpacity = 300; // Distance to scroll before reaching full opacity
    const minOpacity = 0.1; // Starting opacity when at default position
    const maxOpacity = 1.0; // Full opacity when scrolled up
    const transactionBgOpacity = Math.min(
        maxOpacity,
        minOpacity + (transactionScrollY / maxScrollForOpacity) * (maxOpacity - minOpacity)
    );

    return (
        <div className="fixed inset-0 overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: "url('/UI/game/bankbg.png')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 top-60 w-full bg-gradient-to-b from-transparent via-black/80 to-black" />

            {/* Main Content - Scrollable */}
            <div
                ref={scrollContainerRef}
                className="relative h-full overflow-y-auto scrollbar-hide"
                style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                }}
            >
                {/* Fixed Header - Always visible */}
                <div
                    className="sticky top-0 px-8 pt-6 pb-4 z-50 backdrop-blur-sm"
                    style={{
                        backgroundImage: "url('/UI/game/bankbg.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundAttachment: "fixed",
                    }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-white font-robert font-bold text-xl">
                                {bankMockData.userName}
                            </h2>
                            <p className="text-white/80 font-robert text-lg">
                                A/c no: {bankMockData.accountNumber}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 bg-black/80 hover:bg-black hover:border-none border-none text-white font-pixeloid text-sm rounded-xl border transition-colors flex items-center gap-2"
                        >
                            <svg
                                width="15"
                                height="16"
                                viewBox="0 0 15 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M0.789474 16C0.353463 16 0 15.6418 0 15.2V0.8C0 0.358176 0.353463 0 0.789474 0H11.8421C12.2781 0 12.6316 0.358176 12.6316 0.8V3.2H11.0526V1.6H1.57895V14.4H11.0526V12.8H12.6316V15.2C12.6316 15.6418 12.2781 16 11.8421 16H0.789474ZM11.0526 11.2V8.8H5.52632V7.2H11.0526V4.8L15 8L11.0526 11.2Z"
                                    fill="white"
                                />
                            </svg>
                            Exit
                        </button>
                    </div>
                </div>

                {/* Title - Changes based on active tab */}
                <div
                    className="sticky top-[96px] text-center py-8 z-40 overflow-hidden"
                    style={{
                        backgroundImage: "url('/UI/game/bankbg.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundAttachment: "fixed",
                    }}
                >
                    <h1 className="text-white font-pixeloid text-5xl tracking-wide">
                        {activeTab === "overview" ? "Welcome To Dhaniverse Bank" : "Dhaniverse Bank"}
                    </h1>
                </div>

                {/* Conditional Layout based on active tab */}
                {activeTab === "overview" && (
                    <>
                        {/* Main Action Buttons - Fixed, no transform */}
                        <div className="sticky top-[216px] z-35 overflow-hidden">
                            <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto">
                                <button
                                    onClick={handleDeposit}
                                    className="relative flex-1 py-6 text-black font-pixeloid hover:border-none select-none focus:outline-0 text-lg transition-all transform hover:scale-[1.02] overflow-hidden"
                                    style={{
                                        background: "transparent",
                                    }}
                                >
                                    <ButtonBackgroundSVG id="deposit" />
                                    <span className="relative z-10 text-3xl text-[#743A1C]">
                                        DEPOSIT
                                    </span>
                                </button>
                                <button
                                    onClick={handleWithdraw}
                                    className="relative flex-1  py-6 text-black font-pixeloid hover:border-none select-none focus:outline-0 text-lg transition-all transform hover:scale-[1.02] overflow-hidden"
                                    style={{
                                        background: "transparent",
                                    }}
                                >
                                    <ButtonBackgroundSVG id="withdraw" />
                                    <span className="relative z-10 text-3xl text-[#743A1C]">
                                        WITHDRAW
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Tab Navigation - Fixed, no transform */}
                        <div className="sticky top-[296px] mb-6 z-35 overflow-hidden">
                            <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
                                {tabButtons.map((tab) => (
                                    <TabButton
                                        key={tab.id}
                                        icon={tab.icon}
                                        label={tab.label}
                                        onClick={() => setActiveTab(tab.id)}
                                        isActive={activeTab === tab.id}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "bank" && (
                    <>
                        {/* Number Pad and Balance Cards - Max Width Container */}
                        <div className="sticky top-[216px] z-35 px-8 pb-6">
                            <div className="max-w-6xl mx-auto bg-black rounded-xl">
                                {/* Single Black Container with Buttons, Number Pad and Balance Cards */}
                                <div className="p-6 max-w-4xl mx-auto">
                                    {/* Deposit and Withdraw Buttons - Toggleable */}
                                    <div className="flex items-center justify-center gap-2 max-w-sm mx-auto mb-6 bg-yellow-600/50 p-1 rounded-lg">
                                        <button
                                            onClick={() => setTransactionType("deposit")}
                                            className={`flex-1 font-pixeloid text-2xl py-1 px-3 rounded-lg transition-all outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] ${
                                                transactionType === "deposit"
                                                    ? "bg-[#F0C33A] text-white"
                                                    : "bg-transparent text-gray-400 hover:bg-text-gray-200"
                                            }`}
                                        >
                                            Deposit
                                        </button>
                                        <button
                                            onClick={() => setTransactionType("withdraw")}
                                            className={`flex-1 font-pixeloid text-2xl py-1 px-3 rounded-lg transition-all outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] ${
                                                transactionType === "withdraw"
                                                    ? "bg-white text-black"
                                                    : "bg-transparent text-gray-400 hover:text-gray-200"
                                            }`}
                                        >
                                            Withdraw
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Left Side - Number Pad */}
                                        <div className="flex-1">
                                            <NumberPad 
                                                amount={amount}
                                                onNumberClick={handleNumberClick}
                                                onDelete={handleDelete}
                                                onDeposit={transactionType === 'deposit' ? handleDeposit : handleWithdraw}
                                            />
                                        </div>

                                        {/* Right Side - Balance Cards */}
                                        <div className="flex flex-col justify-center w-72">
                                            {/* Bank Balance Card */}
                                            <div className="bg-neutral-900 rounded-xl p-4 flex-1 flex flex-col justify-center">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-gray-400 font-pixeloid text-xs text-center">Bank Balance</span>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                                                        <path d="M12 8V12L14 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                                    </svg>
                                                </div>
                                                <h2 className="text-white font-pixeloid text-3xl mb-1">$10,000</h2>
                                                <p className="text-gray-500 font-pixeloid text-[10px]">Last Deposited $200 on 16/2/25</p>
                                            </div>

                                            {/* Cash Balance Card */}
                                            <div className="bg-neutral-900 rounded-xl p-4 flex-1 flex flex-col justify-center mt-2">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-gray-400 font-pixeloid text-xs">Cash Balance</span>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                                                        <path d="M12 8V12L14 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                                    </svg>
                                                </div>
                                                <h2 className="text-white font-pixeloid text-3xl mb-1">$10,00,000</h2>
                                                <p className="text-gray-500 font-pixeloid text-[10px]">Last Deposited $200 on 16/2/25</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tab Navigation - Absolute position at bottom */}
                        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                            <div className="flex items-center justify-center gap-2">
                                {tabButtons.map((tab) => (
                                    <TabButton
                                        key={tab.id}
                                        icon={tab.icon}
                                        label={tab.label}
                                        onClick={() => setActiveTab(tab.id)}
                                        isCompact={true}
                                        isActive={activeTab === tab.id}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* For Fixed Deposit and NFT tabs - show tabs at bottom position */}
                {(activeTab === "fixed-deposit" || activeTab === "nft") && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                        <div className="flex items-center justify-center gap-2">
                            {tabButtons.map((tab) => (
                                <TabButton
                                    key={tab.id}
                                    icon={tab.icon}
                                    label={tab.label}
                                    onClick={() => setActiveTab(tab.id)}
                                    isCompact={true}
                                    isActive={activeTab === tab.id}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Content Area - Changes based on active tab */}
                <div className="px-8 pb-8 max-w-7xl mx-auto">
                    {activeTab === "overview" && (
                    <div
                        ref={transactionBoxRef}
                        className="backdrop-blur-sm rounded-t-2xl border-t-2 border-x-2 border-white/10 relative z-30 transition-colors duration-300"
                        style={{
                            clipPath:
                                "inset(0px 0px 0px 0px round 16px 16px 0px 0px)",
                            backgroundColor: `rgba(0, 0, 0, ${transactionBgOpacity})`,
                        }}
                    >
                        {/* Transaction Header - Sticks to top of container */}
                        <div className="sticky top-[200px] backdrop-blur-sm px-6 pt-6 pb-4 border-b border-white/10 z-10 rounded-t-2xl"
                            style={{
                            backgroundColor: `rgba(0, 0, 0, ${transactionBgOpacity})`,
                        }}>
                            <div className="flex items-center justify-between mb-2">
                                <h1 className="text-white font-pixeloid text-2xl">
                                    Recent Transaction
                                </h1>
                                <select className="px-3 py-3 bg-white/10 text-white text-center font-tickerbit text-xl rounded-xl cursor-pointer">
                                    <option className="bg-black text-white">All time</option>
                                    <option className="bg-black text-white">Today</option>
                                    <option className="bg-black text-white">This Week</option>
                                    <option className="bg-black text-white">This Month</option>
                                </select>
                            </div>
                        </div>

                        {/* Transaction List - Scrollable content */}
                        <div
                            className="px-6 py-4"
                            style={{
                                clipPath: "inset(0px 0px 0px 0px)",
                            }}
                        >
                            <div className="space-y-3">
                                {bankMockData.transactions.map(
                                    (transaction) => (
                                        <div
                                            key={transaction.id}
                                            className="flex items-center justify-between py-3 border-b border-white/5 hover:bg-white/5 transition-colors px-3 rounded-2xl"
                                        >
                                            <div>
                                                <p className="text-white/50 font-pixeloid text-[10px] mb-0.5">
                                                    {transaction.type}
                                                </p>
                                                <p className="text-white font-pixeloid text-sm">
                                                    {transaction.from} on{" "}
                                                    {transaction.date}
                                                </p>
                                            </div>
                                            <div
                                                className={`font-pixeloid text-base ${
                                                    transaction.isPositive ===
                                                    true
                                                        ? "text-green-500"
                                                        : transaction.isPositive ===
                                                          false
                                                        ? "text-red-500"
                                                        : "text-white"
                                                }`}
                                            >
                                                {transaction.isPositive === true
                                                    ? "+ "
                                                    : transaction.isPositive ===
                                                      false
                                                    ? "- "
                                                    : ""}
                                                {transaction.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    )
                                )}

                                {/* End Message */}
                                <div className="text-center py-16">
                                    <p className="text-white/50 font-pixeloid text-4xl select-none">
                                        No more transactions!
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Check Balance Footer */}
                        <div className="sticky bottom-0 backdrop-blur-sm border-white/10 px-6 py-2 flex items-center justify-center gap-2">
                            <span className="text-white font-robert text-base">
                                Check Balance:
                            </span>
                            <button
                                onClick={() =>
                                    console.log("View Balance clicked")
                                }
                                className="px-5 py-2 bg-[#c45a28] hover:bg-[#d46a38] text-white font-pixeloid text-sm rounded-full border-2 border-[#a04818] transition-colors"
                            >
                                View Balance
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Fixed Deposit Tab Content */}
                    {activeTab === "fixed-deposit" && (
                        <div className="backdrop-blur-sm bg-black rounded-xl p-8">
                            <h2 className="text-white font-pixeloid text-4xl mb-6 text-center">Fixed Deposits</h2>
                            
                            {/* Main Container */}
                            <div className="flex gap-2 max-w-6xl mx-auto">
                                {/* Left Side - Input and Number Pad */}
                                <div className="flex-1 flex flex-col">
                                    
                                    
                                    {/* Number Pad Component (contains the single input) */}
                                    <NumberPad 
                                        amount={fdAmount}
                                        onNumberClick={handleNumberClick}
                                        onDelete={handleDelete}
                                        onDeposit={handleFdDeposit}
                                    />
                                </div>

                                {/* Right Side - Term Selector and Projected Return */}
                                <div className="flex-1 flex flex-col gap-2">
                                    {/* Term Selector Buttons Row */}
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setSelectedTerm("6M")}
                                            className={`flex-1 px-4 py-3 font-pixeloid text-lg rounded-xl transition-all outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] ${
                                                selectedTerm === "6M" 
                                                    ? "bg-neutral-700 text-white" 
                                                    : "bg-neutral-900 text-gray-400 hover:bg-neutral-800"
                                            }`}
                                        >
                                            6 M
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTerm("1Y")}
                                            className={`flex-1 px-4 py-3 font-pixeloid text-lg rounded-xl transition-all outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] ${
                                                selectedTerm === "1Y" 
                                                    ? "bg-neutral-700 text-white" 
                                                    : "bg-neutral-900 text-gray-400 hover:bg-neutral-800"
                                            }`}
                                        >
                                            1 Y
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTerm("3Y")}
                                            className={`flex-1 px-4 py-3 font-pixeloid text-lg rounded-xl transition-all outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] ${
                                                selectedTerm === "3Y" 
                                                    ? "bg-neutral-700 text-white" 
                                                    : "bg-neutral-900 text-gray-400 hover:bg-neutral-800"
                                            }`}
                                        >
                                            3 Y
                                        </button>
                                        <button 
                                            onClick={() => setSelectedTerm("5Y")}
                                            className={`flex-1 px-4 py-3 font-pixeloid text-lg rounded-xl transition-all outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] ${
                                                selectedTerm === "5Y" 
                                                    ? "bg-neutral-700 text-white" 
                                                    : "bg-neutral-900 text-gray-400 hover:bg-neutral-800"
                                            }`}
                                        >
                                            5 Y
                                        </button>
                                    </div>
                                    
                                    {/* Projected Return Container - Graph Left, Calculated Returns Right */}
                                    <div className="flex gap-2 flex-1">
                                        {/* Graph on Left */}
                                        <div className="flex-1 bg-neutral-900 rounded-xl p-4 flex flex-col">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-white font-pixeloid text-sm">Projected Return</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                                                    <path d="M12 8V12M12 16H12.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </div>
                                            {/* Graph SVG Placeholder - PASTE YOUR SVG HERE */}
                                            <div className="flex-1 flex items-center justify-left">
                                                <svg width="178" height="169" viewBox="0 0 178 169" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M27 0L24.1132 5H29.8868L27 0ZM27 148H26.5V148.5H27V148ZM178 148L173 145.113V150.887L178 148ZM27 4.5H26.5V148H27H27.5V4.5H27ZM27 148V148.5H173.5V148V147.5H27V148Z" fill="white"/>
                                                    <path d="M45.3945 167.023V167.512H42.4648V167.023H41.9766V166.535H41.4883V161.652H41.9766V161.164H42.4648V160.676H45.3945V161.164H45.8828V161.652H46.3711V162.629H45.3945V162.141H44.9062V161.652H42.9531V162.141H42.4648V163.605H45.3945V164.094H45.8828V164.582H46.3711V166.535H45.8828V167.023H45.3945ZM42.9531 166.535H44.9062V166.047H45.3945V165.07H44.9062V164.582H42.4648V166.047H42.9531V166.535ZM48.3242 163.605V167.512H47.3477V162.141H48.3242V162.629H48.8125V162.141H51.2539V162.629H51.7422V163.117H52.2305V167.512H51.2539V163.605H50.7656V163.117H50.2773V167.512H49.3008V163.117H48.8125V163.605H48.3242Z" fill="white"/>
                                                    <path d="M80.418 166.535H81.3945V167.512H78.4648V166.535H79.4414V162.629H78.4648V161.652H78.9531V161.164H79.4414V160.676H80.418V166.535ZM84.3242 167.512V166.535H86.7656V166.047H87.2539V164.582H86.7656V165.07H86.2773V165.559H84.3242V165.07H83.8359V164.582H83.3477V161.652H84.3242V164.094H84.8125V164.582H85.7891V164.094H86.2773V163.605H86.7656V162.629H87.2539V161.652H88.2305V166.535H87.7422V167.023H87.2539V167.512H84.3242Z" fill="white"/>
                                                    <path d="M113.977 166.535H113.488V165.559H114.465V166.047H114.953V166.535H116.906V166.047H117.395V165.07H116.906V164.582H115.441V163.605H116.906V163.117H117.395V162.141H116.906V161.652H114.953V162.141H114.465V162.629H113.488V161.652H113.977V161.164H114.465V160.676H117.395V161.164H117.883V161.652H118.371V163.605H117.883V164.582H118.371V166.535H117.883V167.023H117.395V167.512H114.465V167.023H113.977V166.535ZM120.324 167.512V166.535H122.766V166.047H123.254V164.582H122.766V165.07H122.277V165.559H120.324V165.07H119.836V164.582H119.348V161.652H120.324V164.094H120.812V164.582H121.789V164.094H122.277V163.605H122.766V162.629H123.254V161.652H124.23V166.535H123.742V167.023H123.254V167.512H120.324Z" fill="white"/>
                                                    <path d="M149.488 160.676H154.371V161.652H150.465V162.629H153.395V163.117H153.883V163.605H154.371V166.535H153.883V167.023H153.395V167.512H150.465V167.023H149.977V166.535H149.488V165.559H150.465V166.047H150.953V166.535H152.906V166.047H153.395V164.094H152.906V163.605H149.488V160.676ZM156.324 167.512V166.535H158.766V166.047H159.254V164.582H158.766V165.07H158.277V165.559H156.324V165.07H155.836V164.582H155.348V161.652H156.324V164.094H156.812V164.582H157.789V164.094H158.277V163.605H158.766V162.629H159.254V161.652H160.23V166.535H159.742V167.023H159.254V167.512H156.324Z" fill="white"/>
                                                    <path d="M0.976562 19.5352H0.488281V18.5586H1.46484V19.0469H1.95312V19.5352H3.90625V19.0469H4.39453V18.0703H3.90625V17.582H2.44141V16.6055H3.90625V16.1172H4.39453V15.1406H3.90625V14.6523H1.95312V15.1406H1.46484V15.6289H0.488281V14.6523H0.976562V14.1641H1.46484V13.6758H4.39453V14.1641H4.88281V14.6523H5.37109V16.6055H4.88281V17.582H5.37109V19.5352H4.88281V20.0234H4.39453V20.5117H1.46484V20.0234H0.976562V19.5352ZM6.34766 13.6758H11.2305V14.6523H7.32422V15.6289H10.2539V16.1172H10.7422V16.6055H11.2305V19.5352H10.7422V20.0234H10.2539V20.5117H7.32422V20.0234H6.83594V19.5352H6.34766V18.5586H7.32422V19.0469H7.8125V19.5352H9.76562V19.0469H10.2539V17.0938H9.76562V16.6055H6.34766V13.6758ZM13.1836 15.6289H13.6719V14.6523H13.1836V15.6289ZM16.6016 20.0234V20.5117H15.1367V20.0234H14.6484V18.0703H15.1367V17.582H16.6016V18.0703H17.0898V20.0234H16.6016ZM15.625 19.5352H16.1133V18.5586H15.625V19.5352ZM14.6484 16.1172H15.1367V15.6289H15.625V15.1406H16.1133V13.6758H17.0898V15.6289H16.6016V16.1172H16.1133V16.6055H15.625V17.0938H15.1367V17.582H14.6484V18.0703H14.1602V18.5586H13.6719V19.0469H13.1836V20.5117H12.207V18.5586H12.6953V18.0703H13.1836V17.582H13.6719V17.0938H14.1602V16.6055H12.6953V16.1172H12.207V14.1641H12.6953V13.6758H14.1602V14.1641H14.6484V16.1172ZM14.1602 16.6055H14.6484V16.1172H14.1602V16.6055Z" fill="white"/>
                                                    <path d="M0.976562 38.5352H0.488281V37.5586H1.46484V38.0469H1.95312V38.5352H3.90625V38.0469H4.39453V37.0703H3.90625V36.582H2.44141V35.6055H3.90625V35.1172H4.39453V34.1406H3.90625V33.6523H1.95312V34.1406H1.46484V34.6289H0.488281V33.6523H0.976562V33.1641H1.46484V32.6758H4.39453V33.1641H4.88281V33.6523H5.37109V35.6055H4.88281V36.582H5.37109V38.5352H4.88281V39.0234H4.39453V39.5117H1.46484V39.0234H0.976562V38.5352ZM7.8125 36.582V36.0938H8.30078V35.6055H8.78906V35.1172H9.27734V34.6289H10.2539V34.1406H9.76562V33.6523H7.8125V34.1406H7.32422V36.582H7.8125ZM7.32422 37.5586V38.0469H7.8125V38.5352H9.76562V38.0469H10.2539V35.6055H9.76562V36.0938H9.27734V36.582H8.78906V37.0703H8.30078V37.5586H7.32422ZM7.32422 33.1641V32.6758H10.2539V33.1641H10.7422V33.6523H11.2305V38.5352H10.7422V39.0234H10.2539V39.5117H7.32422V39.0234H6.83594V38.5352H6.34766V33.6523H6.83594V33.1641H7.32422ZM13.1836 34.6289H13.6719V33.6523H13.1836V34.6289ZM16.6016 39.0234V39.5117H15.1367V39.0234H14.6484V37.0703H15.1367V36.582H16.6016V37.0703H17.0898V39.0234H16.6016ZM15.625 38.5352H16.1133V37.5586H15.625V38.5352ZM14.6484 35.1172H15.1367V34.6289H15.625V34.1406H16.1133V32.6758H17.0898V34.6289H16.6016V35.1172H16.1133V35.6055H15.625V36.0938H15.1367V36.582H14.6484V37.0703H14.1602V37.5586H13.6719V38.0469H13.1836V39.5117H12.207V37.5586H12.6953V37.0703H13.1836V36.582H13.6719V36.0938H14.1602V35.6055H12.6953V35.1172H12.207V33.1641H12.6953V32.6758H14.1602V33.1641H14.6484V35.1172ZM14.1602 35.6055H14.6484V35.1172H14.1602V35.6055Z" fill="white"/>
                                                    <path d="M1.46484 57.5352H5.37109V58.5117H0.488281V55.582H0.976562V55.0938H1.46484V54.6055H3.90625V54.1172H4.39453V53.1406H3.90625V52.6523H1.95312V53.1406H1.46484V53.6289H0.488281V52.6523H0.976562V52.1641H1.46484V51.6758H4.39453V52.1641H4.88281V52.6523H5.37109V54.6055H4.88281V55.0938H4.39453V55.582H1.95312V56.0703H1.46484V57.5352ZM6.34766 51.6758H11.2305V52.6523H7.32422V53.6289H10.2539V54.1172H10.7422V54.6055H11.2305V57.5352H10.7422V58.0234H10.2539V58.5117H7.32422V58.0234H6.83594V57.5352H6.34766V56.5586H7.32422V57.0469H7.8125V57.5352H9.76562V57.0469H10.2539V55.0938H9.76562V54.6055H6.34766V51.6758ZM13.1836 53.6289H13.6719V52.6523H13.1836V53.6289ZM16.6016 58.0234V58.5117H15.1367V58.0234H14.6484V56.0703H15.1367V55.582H16.6016V56.0703H17.0898V58.0234H16.6016ZM15.625 57.5352H16.1133V56.5586H15.625V57.5352ZM14.6484 54.1172H15.1367V53.6289H15.625V53.1406H16.1133V51.6758H17.0898V53.6289H16.6016V54.1172H16.1133V54.6055H15.625V55.0938H15.1367V55.582H14.6484V56.0703H14.1602V56.5586H13.6719V57.0469H13.1836V58.5117H12.207V56.5586H12.6953V56.0703H13.1836V55.582H13.6719V55.0938H14.1602V54.6055H12.6953V54.1172H12.207V52.1641H12.6953V51.6758H14.1602V52.1641H14.6484V54.1172ZM14.1602 54.6055H14.6484V54.1172H14.1602V54.6055Z" fill="white"/>
                                                    <path d="M1.46484 76.5352H5.37109V77.5117H0.488281V74.582H0.976562V74.0938H1.46484V73.6055H3.90625V73.1172H4.39453V72.1406H3.90625V71.6523H1.95312V72.1406H1.46484V72.6289H0.488281V71.6523H0.976562V71.1641H1.46484V70.6758H4.39453V71.1641H4.88281V71.6523H5.37109V73.6055H4.88281V74.0938H4.39453V74.582H1.95312V75.0703H1.46484V76.5352ZM7.8125 74.582V74.0938H8.30078V73.6055H8.78906V73.1172H9.27734V72.6289H10.2539V72.1406H9.76562V71.6523H7.8125V72.1406H7.32422V74.582H7.8125ZM7.32422 75.5586V76.0469H7.8125V76.5352H9.76562V76.0469H10.2539V73.6055H9.76562V74.0938H9.27734V74.582H8.78906V75.0703H8.30078V75.5586H7.32422ZM7.32422 71.1641V70.6758H10.2539V71.1641H10.7422V71.6523H11.2305V76.5352H10.7422V77.0234H10.2539V77.5117H7.32422V77.0234H6.83594V76.5352H6.34766V71.6523H6.83594V71.1641H7.32422ZM13.1836 72.6289H13.6719V71.6523H13.1836V72.6289ZM16.6016 77.0234V77.5117H15.1367V77.0234H14.6484V75.0703H15.1367V74.582H16.6016V75.0703H17.0898V77.0234H16.6016ZM15.625 76.5352H16.1133V75.5586H15.625V76.5352ZM14.6484 73.1172H15.1367V72.6289H15.625V72.1406H16.1133V70.6758H17.0898V72.6289H16.6016V73.1172H16.1133V73.6055H15.625V74.0938H15.1367V74.582H14.6484V75.0703H14.1602V75.5586H13.6719V76.0469H13.1836V77.5117H12.207V75.5586H12.6953V75.0703H13.1836V74.582H13.6719V74.0938H14.1602V73.6055H12.6953V73.1172H12.207V71.1641H12.6953V70.6758H14.1602V71.1641H14.6484V73.1172ZM14.1602 73.6055H14.6484V73.1172H14.1602V73.6055Z" fill="white"/>
                                                    <path d="M3.41797 95.5352H4.39453V96.5117H1.46484V95.5352H2.44141V91.6289H1.46484V90.6523H1.95312V90.1641H2.44141V89.6758H3.41797V95.5352ZM6.34766 89.6758H11.2305V90.6523H7.32422V91.6289H10.2539V92.1172H10.7422V92.6055H11.2305V95.5352H10.7422V96.0234H10.2539V96.5117H7.32422V96.0234H6.83594V95.5352H6.34766V94.5586H7.32422V95.0469H7.8125V95.5352H9.76562V95.0469H10.2539V93.0938H9.76562V92.6055H6.34766V89.6758ZM13.1836 91.6289H13.6719V90.6523H13.1836V91.6289ZM16.6016 96.0234V96.5117H15.1367V96.0234H14.6484V94.0703H15.1367V93.582H16.6016V94.0703H17.0898V96.0234H16.6016ZM15.625 95.5352H16.1133V94.5586H15.625V95.5352ZM14.6484 92.1172H15.1367V91.6289H15.625V91.1406H16.1133V89.6758H17.0898V91.6289H16.6016V92.1172H16.1133V92.6055H15.625V93.0938H15.1367V93.582H14.6484V94.0703H14.1602V94.5586H13.6719V95.0469H13.1836V96.5117H12.207V94.5586H12.6953V94.0703H13.1836V93.582H13.6719V93.0938H14.1602V92.6055H12.6953V92.1172H12.207V90.1641H12.6953V89.6758H14.1602V90.1641H14.6484V92.1172ZM14.1602 92.6055H14.6484V92.1172H14.1602V92.6055Z" fill="white"/>
                                                    <path d="M3.41797 114.535H4.39453V115.512H1.46484V114.535H2.44141V110.629H1.46484V109.652H1.95312V109.164H2.44141V108.676H3.41797V114.535ZM7.8125 112.582V112.094H8.30078V111.605H8.78906V111.117H9.27734V110.629H10.2539V110.141H9.76562V109.652H7.8125V110.141H7.32422V112.582H7.8125ZM7.32422 113.559V114.047H7.8125V114.535H9.76562V114.047H10.2539V111.605H9.76562V112.094H9.27734V112.582H8.78906V113.07H8.30078V113.559H7.32422ZM7.32422 109.164V108.676H10.2539V109.164H10.7422V109.652H11.2305V114.535H10.7422V115.023H10.2539V115.512H7.32422V115.023H6.83594V114.535H6.34766V109.652H6.83594V109.164H7.32422ZM13.1836 110.629H13.6719V109.652H13.1836V110.629ZM16.6016 115.023V115.512H15.1367V115.023H14.6484V113.07H15.1367V112.582H16.6016V113.07H17.0898V115.023H16.6016ZM15.625 114.535H16.1133V113.559H15.625V114.535ZM14.6484 111.117H15.1367V110.629H15.625V110.141H16.1133V108.676H17.0898V110.629H16.6016V111.117H16.1133V111.605H15.625V112.094H15.1367V112.582H14.6484V113.07H14.1602V113.559H13.6719V114.047H13.1836V115.512H12.207V113.559H12.6953V113.07H13.1836V112.582H13.6719V112.094H14.1602V111.605H12.6953V111.117H12.207V109.164H12.6953V108.676H14.1602V109.164H14.6484V111.117ZM14.1602 111.605H14.6484V111.117H14.1602V111.605Z" fill="white"/>
                                                    <path d="M0.488281 127.676H5.37109V128.652H1.46484V129.629H4.39453V130.117H4.88281V130.605H5.37109V133.535H4.88281V134.023H4.39453V134.512H1.46484V134.023H0.976562V133.535H0.488281V132.559H1.46484V133.047H1.95312V133.535H3.90625V133.047H4.39453V131.094H3.90625V130.605H0.488281V127.676ZM7.32422 129.629H7.8125V128.652H7.32422V129.629ZM10.7422 134.023V134.512H9.27734V134.023H8.78906V132.07H9.27734V131.582H10.7422V132.07H11.2305V134.023H10.7422ZM9.76562 133.535H10.2539V132.559H9.76562V133.535ZM8.78906 130.117H9.27734V129.629H9.76562V129.141H10.2539V127.676H11.2305V129.629H10.7422V130.117H10.2539V130.605H9.76562V131.094H9.27734V131.582H8.78906V132.07H8.30078V132.559H7.8125V133.047H7.32422V134.512H6.34766V132.559H6.83594V132.07H7.32422V131.582H7.8125V131.094H8.30078V130.605H6.83594V130.117H6.34766V128.164H6.83594V127.676H8.30078V128.164H8.78906V130.117ZM8.30078 130.605H8.78906V130.117H8.30078V130.605Z" fill="white"/>
                                                    <path d="M16.9531 159.582V159.094H17.4414V158.605H17.9297V158.117H18.418V157.629H19.3945V157.141H18.9062V156.652H16.9531V157.141H16.4648V159.582H16.9531ZM16.4648 160.559V161.047H16.9531V161.535H18.9062V161.047H19.3945V158.605H18.9062V159.094H18.418V159.582H17.9297V160.07H17.4414V160.559H16.4648ZM16.4648 156.164V155.676H19.3945V156.164H19.8828V156.652H20.3711V161.535H19.8828V162.023H19.3945V162.512H16.4648V162.023H15.9766V161.535H15.4883V156.652H15.9766V156.164H16.4648Z" fill="white"/>
                                                    <path d="M27 148L37.5 138L78 124L116.5 70L152.5 17" stroke="white"/>
                                                    <circle cx="38" cy="138" r="3" fill="white"/>
                                                    <circle cx="78" cy="124" r="3" fill="white"/>
                                                    <circle cx="115" cy="72" r="3" fill="white"/>
                                                    <circle cx="153" cy="17" r="3" fill="white"/>
                                                </svg>
                                            </div>
                                        </div>
                                        
                                        {/* Calculated Returns on Right */}
                                        <div className="flex-1 bg-neutral-900 rounded-xl p-6 flex flex-col justify-center items-center">
                                            <span className="text-neutral-400 font-pixeloid text-xs mb-2">Return in 6 months</span>
                                            <span className="text-white font-pixeloid text-5xl mb-2">$700</span>
                                            <span className="text-neutral-500 font-pixeloid text-[10px]">10,000*0.5*3.5%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Bottom Info Text */}
                            <div className="mt-8 text-center">
                                <p className="text-white font-pixeloid text-lg">
                                    The land of Dverse works 10x faster 1 day is 20 mins long in game
                                </p>
                            </div>
                        </div>
                    )}

                    {/* NFT Tab Content */}
                    {activeTab === "nft" && (
                        <div className="backdrop-blur-sm bg-black rounded-2xl p-12 border-2 border-white/10 text-center">
                            <h2 className="text-white font-pixeloid text-3xl mb-20">Web 3 Features</h2>
                            <p className="text-gray-400 font-pixeloid text-5xl mb-4">Coming Soon!</p>
                            <p className="text-gray-400 font-pixeloid text-xl mb-20">Devs cooking in bg!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestBankDashboard;
