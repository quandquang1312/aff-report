import { useMemo, useState } from "react";
import "./App.css";
const API_URL = import.meta.env.VITE_API_URL;

function CopyableNumber({ value }) {
    const display = value.toLocaleString();
    return (
        <span className="copyable-number" data-display={display}>
            {value}
        </span>
    );
}

export default function App() {
    const [adsFile, setAdsFile] = useState(null);
    const [shopeeFiles, setShopeeFiles] = useState([]);
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: "asc",
    });

    const columns = response?.table?.length ? Object.keys(response.table[0]) : [];
    const numericColumns = new Set(
        response?.table?.length
            ? Object.entries(response.table[0])
                .filter(([, value]) => typeof value === "number")
                .map(([key]) => key)
            : []
    );

    const sortableColumns = new Set(["ads", "Hoa hồng", "profit"]);

    const parseNumber = (value) => {
        if (typeof value === "number") return value;
        if (typeof value === "string") return Number(value.replace(/,/g, "").replace("%", ""));
        return 0;
    };

    const formatPercent = (value) => `${Number(value ?? 0).toFixed(2)}%`;

    const sortedTable = useMemo(() => {
        if (!response?.table?.length || !sortConfig.key) return response?.table ?? [];

        const sorted = [...response.table].sort((a, b) => {
            const aValue = parseNumber(a[sortConfig.key]);
            const bValue = parseNumber(b[sortConfig.key]);

            return sortConfig.direction === "asc"
                ? aValue - bValue
                : bValue - aValue;
        });

        return sorted;
    }, [response, sortConfig]);

    const handleSort = (column) => {
        if (!sortableColumns.has(column)) return;

        setSortConfig((prev) => ({
            key: column,
            direction:
                prev.key === column && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    const handleAdsFileChange = (file) => {
        setAdsFile(file);
    };

    const handleShopeeFileChange = (index, file) => {
        const newFiles = [...shopeeFiles];
        newFiles[index] = file;
        setShopeeFiles(newFiles);
    };

    const addShopeeFile = () => {
        setShopeeFiles([...shopeeFiles, null]);
    };

    const removeShopeeFile = (index) => {
        setShopeeFiles(shopeeFiles.filter((_, i) => i !== index));
    };

    const upload = async () => {
        const formData = new FormData();

        if (adsFile) formData.append("ads_file", adsFile);
        shopeeFiles.forEach((file) => {
            if (file) formData.append("shopee_report_files", file);
        });

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/analyze`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`API error: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            setResponse(data);
        } catch (err) {
            console.error("Upload error:", err);
            setResponse({ error: err.message });
        }

        setLoading(false);
    };

    return (
        <div className="app">
            <div className="container">
                <h2 className="page-title">Commission Analysis</h2>

                {/* Ads File Upload */}
                <div className="panel">
                    <div className="panel-row">
                        <label className="panel-label">📄 Ads Report File:</label>
                        <div className="file-inline">
                            <input
                                type="file"
                                onChange={(e) => handleAdsFileChange(e.target.files[0])}
                            />
                            {adsFile && <span className="file-ok">✓ {adsFile.name}</span>}
                        </div>
                    </div>
                </div>

                {/* Shopee Files Upload */}
                <div className="panel">
                    <label className="panel-label">📄 Conversion Report Files:</label>

                    {shopeeFiles.map((file, index) => (
                        <div key={index} className="shopee-row">
                            <button
                                onClick={() => removeShopeeFile(index)}
                                className="btn btn-danger"
                            >
                                Remove
                            </button>

                            <div className="file-inline">
                                <input
                                    type="file"
                                    onChange={(e) => handleShopeeFileChange(index, e.target.files[0])}
                                />
                                {file && <span className="file-ok">✓ {file.name}</span>}
                            </div>
                        </div>
                    ))}

                    <div className="center">
                        <button onClick={addShopeeFile} className="btn btn-success">
                            + Add Conversion Report File
                        </button>
                    </div>
                </div>

                <div className="center">
                    <button
                        onClick={upload}
                        disabled={loading || !adsFile || shopeeFiles.every(f => !f)}
                        className="btn btn-primary"
                    >
                        {loading ? "ANALYZING..." : "ANALYZE"}
                    </button>
                </div>

                {response && !response.error && response.summary && (
                    <div className="results">
                        <div className="summary-grid">
                            <div className="summary-card card-qc">
                                <div className="summary-label">Total Ads</div>
                                <div className="summary-value">{response.summary.total_ads.toLocaleString()}</div>
                            </div>

                            <div className="summary-card card-commission">
                                <div className="summary-label">Total Hoa hồng</div>
                                <div className="summary-value">{response.summary.total_commission.toLocaleString()}</div>
                            </div>

                            <div className="summary-card card-profit">
                                <div className="summary-label">Profit Margin</div>
                                <div className="summary-value">{formatPercent(response.summary.profit_margin)}</div>
                            </div>
                        </div>

                        <div className="table-card">
                            <h3 className="table-title">📋 Report Details</h3>
                            <div className="table-wrap">
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            {columns.map((column) => (
                                                <th
                                                    key={column}
                                                    onClick={() => handleSort(column)}
                                                    style={{
                                                        textAlign: numericColumns.has(column) ? "right" : "left",
                                                        cursor: sortableColumns.has(column) ? "pointer" : "default",
                                                    }}
                                                >
                                                    {column}
                                                    {sortConfig.key === column
                                                        ? sortConfig.direction === "asc" ? " ▲" : " ▼"
                                                        : ""}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTable.map((row, index) => (
                                            <tr key={index}>
                                                {columns.map((column) => {
                                                    const value = row[column];
                                                    return (
                                                        <td
                                                            key={column}
                                                            style={{
                                                                textAlign: numericColumns.has(column) ? "right" : "left",
                                                                fontWeight: column === "sub_id" ? 700 : 400,
                                                            }}
                                                        >
                                                            {typeof value === "number"
                                                                ? column === "profit"
                                                                    ? `${value.toFixed(2)}%`
                                                                    : <CopyableNumber value={value} />
                                                                : column === "profit"
                                                                    ? `${Number(value || 0).toFixed(2)}%`
                                                                    : value}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {response && response.error && (
                    <div className="error-box">
                        <strong>Error:</strong> {response.error}
                    </div>
                )}
            </div>
        </div>
    );
}