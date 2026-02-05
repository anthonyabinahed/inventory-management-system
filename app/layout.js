import { Suspense } from "react";
import { Inter } from "next/font/google";
import Image from "next/image";
import ClientLayout from "@/components/LayoutClient";
import Header from "@/components/Header";
import { getCurrentUser } from "@/actions/auth";
import { verifyAdmin } from "@/actions/admin";
import config from "@/config";
import logo from "@/app/icon.png";
import "./globals.css";

const font = Inter({ subsets: ["latin"] });

export const viewport = {
	themeColor: config.colors.main,
	width: "device-width",
	initialScale: 1,
};

async function HeaderWithUser() {
	const user = await getCurrentUser();
	const { isAdmin } = user ? await verifyAdmin() : { isAdmin: false };
	return <Header user={user} isAdmin={isAdmin} />;
}

function HeaderFallback() {
	return (
		<header className="bg-base-200">
			<nav className="container flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4 mx-auto">
				<Image
					src={logo}
					alt={`${config.appName} logo`}
					priority={true}
					width={180}
					height={45}
					className="w-[140px] sm:w-[180px] lg:w-[220px] h-auto"
				/>
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
