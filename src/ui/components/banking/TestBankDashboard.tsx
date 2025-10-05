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
        setAmount(prev => prev + num);
    };

    const handleDelete = () => {
        setAmount(prev => prev.slice(0, -1));
    };

    const handleDeposit = () => {
        if (amount) {
            console.log("Deposit amount:", amount);
            // Add deposit logic here
            setAmount("");
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
                            className="px-4 py-2 bg-black/80 hover:bg-black hover:border-none border-none text-white font-pixeloid text-sm rounded-md border transition-colors flex items-center gap-2"
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
                            <div className="flex items-center justify-center gap-6 max-w-2xl mx-auto">
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
                                            <input
                                                type="text"
                                                value={amount}
                                                readOnly
                                                placeholder="Enter Amount"
                                                className="w-full bg-neutral-900 text-white font-pixeloid text-lg px-2 py-3 rounded-md mb-2 text-center placeholder-gray-500"
                                            />
                                            
                                            {/* Number Grid */}
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                                                    <button
                                                        key={num}
                                                        onClick={() => handleNumberClick(num.toString())}
                                                        className="bg-neutral-900 hover:bg-neutral-800 outline-none focus:outline-none hover:border-none border-none text-white font-pixeloid text-xl py-3 rounded-md transition-all hover:scale-[1.02]"
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            {/* Bottom Row: Empty space, 0 centered, and Delete */}
                                            <div className="grid grid-cols-3 gap-2">
                                                <div></div>
                                                <button
                                                    onClick={() => handleNumberClick("0")}
                                                    className="bg-neutral-900 hover:bg-neutral-800 outline-none focus:outline-none hover:border-none border-none text-white font-pixeloid text-xl py-2 rounded-md transition-all hover:scale-[1.02]"
                                                >
                                                    0
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    className="bg-red-700 hover:bg-red-600 text-white font-pixeloid outline-none focus:outline-none hover:border-none border-none text-sm py-2 rounded-md transition-all hover:scale-[1.02] flex items-center justify-center gap-1"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M19 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H19V11Z" fill="currentColor"/>
                                                    </svg>
                                                    Delete
                                                </button>
                                            </div>
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
                                <select className="px-3 py-1.5 bg-[#1a1a1a] text-white font-pixeloid text-xs rounded border border-white/20 cursor-pointer">
                                    <option>All time</option>
                                    <option>Today</option>
                                    <option>This Week</option>
                                    <option>This Month</option>
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
                                                        ? "text-green-400"
                                                        : transaction.isPositive ===
                                                          false
                                                        ? "text-red-400"
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
                        <div className="sticky bottom-0 backdrop-blur-sm border-white/10 px-6 py-2 flex items-center justify-center gap-3">
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
                        <div className="backdrop-blur-sm bg-black/60 rounded-2xl p-12 border-2 border-white/10 text-center">
                            <h2 className="text-white font-pixeloid text-3xl mb-4">Fixed Deposit</h2>
                            <p className="text-gray-400 font-pixeloid text-lg">Coming Soon!</p>
                        </div>
                    )}

                    {/* NFT Tab Content */}
                    {activeTab === "nft" && (
                        <div className="backdrop-blur-sm bg-black/60 rounded-2xl p-12 border-2 border-white/10 text-center">
                            <h2 className="text-white font-pixeloid text-3xl mb-4">NFT Gallery</h2>
                            <p className="text-gray-400 font-pixeloid text-lg">Coming Soon!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TestBankDashboard;
