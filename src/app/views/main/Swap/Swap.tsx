import { Box, Button, ButtonGroup, IconButton, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { KeyValueDisplay, NotificationBox } from "app/components";
import MainCard from "app/layouts/MainCard";
import { actions } from "app/store";
import { SwapFormState } from "app/store/swap/types";
import { RootState } from "app/store/types";
import { WalletState } from "app/store/wallet/types";
import { AppTheme } from "app/theme/types";
import { useMoneyFormatter } from "app/utils";
import cls from "classnames";
import Decimal from "decimal.js";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CurrencyInput, ShowAdvanced } from "./components";
import { ReactComponent as SwapSVG } from "./swap_logo.svg";

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  container: {
    padding: `${theme.spacing(4)}px ${theme.spacing(8)}px ${theme.spacing(0)}px ${theme.spacing(8)}px`,
    [theme.breakpoints.down("xs")]: {
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
    },
  },
  swapButton: {
    padding: 0
  },
  inputRow: {
    paddingLeft: 0
  },
  currencyButton: {
    borderRadius: 0,
    color: theme.palette.text!.primary,
    fontWeight: 600,
    width: 150,
    display: "flex",
    justifyContent: "space-between"
  },
  label: {
    fontSize: "12px",
    lineHeight: "14px",
    fontWeight: "bold",
    letterSpacing: 0,
    marginBottom: theme.spacing(1),
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  percentageButton: {
    borderRadius: 4,
    color: theme.palette.text?.secondary,
    paddingTop: 10,
    paddingBottom: 10
  },
  percentageGroup: {
    marginTop: 12
  },
  actionButton: {
    marginTop: theme.spacing(6),
    height: 46
  },
  advanceDetails: {
    marginTop: theme.spacing(9),
    marginBottom: theme.spacing(4),
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    color: theme.palette.text!.secondary,
    cursor: "pointer"
  },
  primaryColor: {
    color: theme.palette.primary.main
  },
}));


const Swap: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props: any) => {
  const { children, className, ...rest } = props;
  const classes = useStyles();
  const [error, setError] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(true);
  const [notification, setNotification] = useState<{ type: string; message: string; } | null>({ type: "success", message: "Transaction Submitted." });
  const formState = useSelector<RootState, SwapFormState>(state => state.swap);
  const wallet = useSelector<RootState, WalletState>(state => state.wallet);
  const moneyFormat = useMoneyFormatter({ decPlaces: 10 });

  const dispatch = useDispatch();

  const onConnectWallet = () => {
    dispatch(actions.Layout.toggleShowWallet());
  };

  const onReverse = () => {
    const values = { ...formState.values };
    const { give, receive, giveCurrency, receiveCurrency, rate } = values;
    dispatch(actions.Swap.update({
      ...formState,
      values: {
        ...formState.values,
        give: receive,
        receive: give,
        receiveCurrency: giveCurrency,
        giveCurrency: receiveCurrency,
        rate: +(new Decimal(1).dividedBy(new Decimal(rate)).toFixed(10)),
      }
    }));
  }

  const onPercentage = (percentage: number) => {
    const currency = formState.values.giveCurrency;
    const balance = wallet.currencies[currency] > 0 ? +(moneyFormat(wallet.currencies[currency], { currency })) : 0;
    dispatch(actions.Swap.update_extended({
      key: "give",
      value: balance * percentage
    }));
  }

  return (
    <MainCard {...rest} hasNotification={notification} className={cls(classes.root, className)}>
      <NotificationBox notification={notification} setNotification={setNotification} />
      <Box display="flex" flexDirection="column" className={classes.container}>
        <CurrencyInput
          label="You Give"
          name="give"
        >
          <ButtonGroup fullWidth color="primary" className={classes.percentageGroup}>
            <Button onClick={() => onPercentage(0.25)} className={classes.percentageButton}>
              <Typography variant="button">25%</Typography>
            </Button>
            <Button onClick={() => onPercentage(0.5)} className={classes.percentageButton}>
              <Typography variant="button">50%</Typography>
            </Button>
            <Button onClick={() => onPercentage(0.75)} className={classes.percentageButton}>
              <Typography variant="button">75%</Typography>
            </Button>
            <Button onClick={() => onPercentage(1)} className={classes.percentageButton}>
              <Typography variant="button">100%</Typography
              ></Button>
          </ButtonGroup>
        </CurrencyInput>
        <Box display="flex" mt={4} mb={1} justifyContent="center">
          <IconButton
            onClick={() => onReverse()}
            className={classes.swapButton}
          >
            <SwapSVG />
          </IconButton>
        </Box>
        <CurrencyInput
          label="You Receive"
          name="receive"
        >
          <KeyValueDisplay mt={"22px"} kkey={"Exchange Rate"} value={`1 ${formState.values.giveCurrency} = ${formState.values.rate} ${formState.values.receiveCurrency}`} />
        </CurrencyInput>
        {!wallet.wallet && (<Button
          className={classes.actionButton}
          variant="contained"
          color="primary"
          fullWidth
          onClick={onConnectWallet}
        >Connect Wallet</Button>)}
        {wallet.wallet && (<Button
          className={classes.actionButton}
          variant="contained"
          color="primary"
          fullWidth
          disabled={!(formState.values.give && formState.values.receive)}
          onClick={onConnectWallet}
        >Swap</Button>)}
        <Typography variant="body2" className={cls(classes.advanceDetails, showAdvanced ? classes.primaryColor : {})} onClick={() => setShowAdvanced(!showAdvanced)}>
          Advanced Details{showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Typography>
      </Box>
      <ShowAdvanced
        showAdvanced={showAdvanced}
      />
    </MainCard >
  );
};

export default Swap;