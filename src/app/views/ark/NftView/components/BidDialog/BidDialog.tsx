import React, { Fragment, useState } from "react";
import { Backdrop, Box, Checkbox, DialogContent, DialogProps, FormControlLabel } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import UncheckedIcon from "@material-ui/icons/CheckBoxOutlineBlankRounded";
import BigNumber from "bignumber.js";
import cls from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { useRouteMatch } from "react-router";
import { useHistory } from "react-router-dom";
import { bnOrZero } from "tradehub-api-js/build/main/lib/tradehub/utils";
import { CurrencyInput, DialogModal, FancyButton, Text } from "app/components";
import { getBlockchain, getTokens, getWallet } from "app/saga/selectors";
import { actions } from "app/store";
import { Nft } from "app/store/marketplace/types";
import { RootState, TokenInfo } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { useAsyncTask } from "app/utils";
import { ZIL_ADDRESS } from "app/utils/constants";
import { NftCard } from "app/views/ark/Collection/components";
import { ReactComponent as CheckedIcon } from "app/views/ark/Collections/checked-icon.svg";
import { ArkClient, logger } from "core/utilities";
import { fromBech32Address, ZilswapConnector } from "core/zilswap";
import { ReactComponent as ChainLinkIcon } from "../BuyDialog/chainlink.svg";

interface Props extends Partial<DialogProps> {
  token: Nft;
  collectionAddress: string;
}

const initialFormState = {
  bidAmount: "0",
  acceptTerms: false,
};

const BidDialog: React.FC<Props> = (props: Props) => {
  const { children, className, collectionAddress, token, ...rest } = props;
  const classes = useStyles();
  const dispatch = useDispatch();
  const history = useHistory();
  const { network } = useSelector(getBlockchain);
  const { wallet } = useSelector(getWallet);
  const tokenState = useSelector(getTokens);
  const open = useSelector<RootState, boolean>((state) => state.layout.showBidNftDialog);
  const [runConfirmPurchase, loading, error] = useAsyncTask("confirmPurchase");
  const [completedPurchase, setCompletedPurchase] = useState<boolean>(false);
  const [formState, setFormState] = useState<typeof initialFormState>(initialFormState);
  const [bidToken, setBidToken] = useState<TokenInfo>(tokenState.tokens[ZIL_ADDRESS]);
  const match = useRouteMatch<{ id: string, collection: string }>();

  const onConfirm = () => {
    if (!wallet) return;
    runConfirmPurchase(async () => {
      const { collection: address, id } = match.params

      if (!bidToken) return; // TODO: handle token not found

      const priceAmount = bnOrZero(formState.bidAmount).shiftedBy(bidToken.decimals);
      const price = { amount: priceAmount, address: fromBech32Address(bidToken.address) };
      const feeAmount = priceAmount.times(ArkClient.FEE_BPS).dividedToIntegerBy(10000).plus(1);

      const arkClient = new ArkClient(network);
      const nonce = new BigNumber(Math.random()).times(2147483647).decimalPlaces(0); // int32 max 2147483647
      const currentBlock = ZilswapConnector.getCurrentBlock();
      const expiry = currentBlock + 300; // blocks
      const message = arkClient.arkMessage("Execute", arkClient.arkChequeHash({
        side: "Buy",
        token: { address, id, },
        price,
        feeAmount,
        expiry,
        nonce,
      }))

      const { signature, publicKey } = (await wallet.provider!.wallet.sign(message as any)) as any

      const result = await arkClient.postTrade({
        publicKey,
        signature,

        collectionAddress: address,
        address: wallet.addressInfo.byte20.toLowerCase(),
        tokenId: id,
        side: "Buy",
        expiry,
        nonce,
        price,
      });

      logger("post trade", result);
    });
  };

  const onCloseDialog = () => {
    if (loading) return;
    dispatch(actions.Layout.toggleShowBidNftDialog("close"));
    setFormState({
      bidAmount: "0",
      acceptTerms: false,
    });
    setCompletedPurchase(false);
  };

  const onViewCollection = () => {
    dispatch(actions.Layout.toggleShowBidNftDialog("close"));
    history.push("/ark/profile");
  };

  const onCurrencyChange = (token: TokenInfo) => {
    setBidToken(token);
  };

  const onBidAmountChange = (rawAmount: string = "0") => {
    setFormState({
      ...formState,
      bidAmount: rawAmount,
    });
  };

  const onEndEditBidAmount = () => {
    let bidAmount = new BigNumber(formState.bidAmount).decimalPlaces(
      bidToken?.decimals ?? 0
    );
    if (bidAmount.isNaN() || bidAmount.isNegative() || !bidAmount.isFinite())
      setFormState({
        ...formState,
        bidAmount: "0",
      });
  };

  return (
    <DialogModal
      header="Place a Bid"
      {...rest}
      open={open}
      onClose={onCloseDialog}
      className={cls(classes.root, className)}
    >
      <DialogContent className={cls(classes.dialogContent)}>
        {/* Nft card */}
        <NftCard
          className={classes.nftCard}
          token={token}
          collectionAddress={fromBech32Address(collectionAddress)}
          dialog={true}
        />

        <CurrencyInput
          label="Place Your Bid"
          token={bidToken ?? null}
          amount={formState.bidAmount}
          onEditorBlur={onEndEditBidAmount}
          onAmountChange={onBidAmountChange}
          onCurrencyChange={onCurrencyChange}
        />

        {!(loading || completedPurchase) && (
          <Fragment>
            {/* Terms */}
            <Box className={classes.termsBox}>
              <FormControlLabel
                control={
                  <Checkbox
                    className={classes.radioButton}
                    checkedIcon={<CheckedIcon />}
                    icon={<UncheckedIcon fontSize="small" />}
                    checked={formState.acceptTerms}
                    onChange={() =>
                      setFormState({
                        ...formState,
                        acceptTerms: !formState.acceptTerms,
                      })
                    }
                    disableRipple
                  />
                }
                label={
                  <Text>
                    By checking this box, I accept ARK's terms and conditions.
                  </Text>
                }
              />
            </Box>

            {error && (
              <Text color="error">Error: {error?.message ?? "Unknown error"}</Text>
            )}

            <FancyButton
              className={classes.actionButton}
              loading={loading}
              variant="contained"
              color="primary"
              onClick={onConfirm}
              disabled={!formState.acceptTerms}
              walletRequired
            >
              Place Bid
            </FancyButton>
          </Fragment>
        )}

        {completedPurchase && (
          <FancyButton
            className={classes.collectionButton}
            variant="contained"
            color="primary"
            onClick={onViewCollection}
            walletRequired
          >
            View Collection
          </FancyButton>
        )}

        {/* to clean up */}
        <Backdrop open={loading} className={classes.backdrop}>
          <Box flex={1}>
            <Text variant="h2" align="center" className={classes.loadingTitle}>
              Purchase Processing
            </Text>

            <Text align="center" className={classes.loadingBody}>
              Sit tight, it should be confirmed shortly.
            </Text>
          </Box>

          <ChainLinkIcon />

          <Box flex={1} />
        </Backdrop>
      </DialogContent>
    </DialogModal>
  );
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
    "& .MuiDialogTitle-root": {
      padding: theme.spacing(3),
      "& .MuiTypography-root": {
        fontFamily: "'Raleway', sans-serif",
        fontWeight: 700,
        fontSize: "24px",
        linHeight: "36px",
      },
      "& .MuiSvgIcon-root": {
        fontSize: "1.8rem",
      },
    },
    position: "relative",
  },
  backdrop: {
    position: "absolute",
    zIndex: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: theme.spacing(3),
  },
  dialogContent: {
    backgroundColor: theme.palette.background.default,
    borderLeft:
      theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid #D2E5DF",
    borderRight:
      theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid #D2E5DF",
    borderBottom:
      theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid #D2E5DF",
    borderRadius: "0 0 12px 12px",
    padding: theme.spacing(0, 3, 2),
    minWidth: 380,
    maxWidth: 411,
    overflowY: "auto",
  },
  actionButton: {
    height: 46,
  },
  collectionButton: {
    height: 46,
    marginTop: theme.spacing(1),
  },
  nftCard: {
    maxWidth: "none",
  },
  radioButton: {
    padding: "6px",
    "&:hover": {
      background: "transparent!important",
    },
  },
  termsBox: {
    marginBottom: theme.spacing(1),
    "& .MuiFormControlLabel-root": {
      marginLeft: "-8px",
      marginRight: 0,
    },
  },
  priceBox: {
    borderRadius: 12,
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.currencyInput,
    marginBottom: theme.spacing(1),
  },
  priceText: {
    fontSize: "20px",
    lineHeight: "30px",
  },
  price: {
    fontFamily: "'Raleway', sans-serif",
    fontWeight: 900,
    fontSize: "28px",
    paddingBottom: "4px",
    color: theme.palette.primary.dark,
  },
  currencyLogo: {
    paddingBottom: "4px",
  },
  txText: {
    color: theme.palette.label,
  },
  icon: {
    fontSize: "14px",
    color: theme.palette.label,
  },
  link: {
    color: theme.palette.text?.primary,
  },
  linkIcon: {
    marginLeft: 2,
    verticalAlign: "top",
  },
  loadingTitle: {
    fontFamily: "'Raleway', sans-serif",
    fontSize: "24px",
    linHeight: "40px",
  },
  loadingBody: {
    fontSize: "14px",
    lineHeight: "24px",
    marginTop: theme.spacing(0.5),
  },
}));

export default BidDialog;