import pandas as pd

# SHOPEE REPORT
def get_commission_by_subid(file_path):
    df = pd.read_csv(file_path)
    df_selected = df.iloc[:, [36, 41]].rename(
        columns={
            "Hoa hồng ròng tiếp thị liên kết(₫)": "Hoa hồng",
            "Sub_id1": "sub_id"
        }
    )

    result = (
        df_selected.groupby("sub_id")["Hoa hồng"]
        .sum()
        .reset_index()
    )

    return result

# ADS REPORT
def get_ads_by_subid(file_path):
    df = pd.read_csv(file_path)
    df_selected = df[["Tên chiến dịch", "Số tiền đã chi tiêu (VND)"]].rename(
        columns={
            "Tên chiến dịch": "sub_id",
            "Số tiền đã chi tiêu (VND)": "ads"
        }
    )
    df_selected["sub_id"] = df_selected["sub_id"].astype(str).str.split("_").str[0]

    result = (
        df_selected.groupby("sub_id")["ads"]
        .sum()
        .reset_index()
    )

    return result

# MERGE INTO ONE DF
def merge_data(ads, *commissions):
    all_commissions = pd.concat(commissions, ignore_index=True)
    all_commissions = (
        all_commissions.groupby("sub_id")["Hoa hồng"]
        .sum()
        .reset_index()
    )

    df_combined = pd.merge(ads, all_commissions, on="sub_id", how="outer")
    for col in ["ads", "Hoa hồng"]:
        df_combined[col] = (
            pd.to_numeric(df_combined[col], errors="coerce")
            .replace([float("inf"), float("-inf")], pd.NA)
            .fillna(0)
            .astype("int64")
        )

    df_combined["sub_id"] = df_combined["sub_id"].fillna("").astype(str)
    # Profit margin = (Hoa hồng - ads) / Hoa hồng * 100
    df_combined["profit"] = (
        ((df_combined["Hoa hồng"] * 0.8) - (df_combined["ads"] * 1.011))
        / df_combined["Hoa hồng"].replace(0, pd.NA)
    )
    df_combined["profit"] = (
        df_combined["profit"]
        .replace([float("inf"), float("-inf")], pd.NA)
        .fillna(0)
        * 100
    ).round(2)

    return df_combined

# API FastAPI
def analyze(ads_file, shopee_report_files):
    ads1        = get_ads_by_subid(ads_file)
    commissions = [get_commission_by_subid(path) for path in shopee_report_files]

    df = merge_data(ads1, *commissions)

    total_ads = int(pd.to_numeric(df["ads"], errors="coerce").fillna(0).sum())
    total_commission = int(pd.to_numeric(df["Hoa hồng"], errors="coerce").fillna(0).sum())
    profit_margin = round(
        ((total_commission * 0.8) - (total_ads * 1.011)) / total_commission * 100, 2
    ) if total_commission != 0 else 0

    return {
        "summary": {
            "total_ads": total_ads,
            "total_commission": total_commission,
            "profit_margin": profit_margin
        },
        "table": df.to_dict(orient="records")
    }