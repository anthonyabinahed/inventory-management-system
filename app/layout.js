import { Suspense } from "react";
import { Inter } from "next/font/google";
import ClientLayout from "@/components/LayoutClient";
import Header from "@/components/Header";
import { getCurrentUser } from "@/actions/auth";
import config from "@/config";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });

export const viewport = {
	themeColor: config.colors.main,
	width: "device-width",
	initialScale: 1,
};

async function HeaderWithUser() {
	const user = await getCurrentUser();
	return <Header user={user} />;
}

function HeaderFallback() {
	return (
		<header className="bg-base-200">
			<nav className="container flex items-center justify-between px-8 py-4 mx-auto">
				<span className="font-extrabold text-lg">{config.appName}</span>
			</nav>
		</header>
	);
}

export default function RootLayout({ children }) {
	return (
		<html
			lang="en"
			data-theme={config.colors.theme}
			className={font.className}
		>
			<body>
				<Suspense fallback={<HeaderFallback />}>
					<HeaderWithUser />
				</Suspense>
				<ClientLayout>{children}</ClientLayout>
			</body>
		</html>
	);
}
