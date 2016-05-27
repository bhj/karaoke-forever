import React from 'react'
import Header from '../../components/Header'
import classes from './CoreLayout.css'
import '../../styles/core.scss'

export const CoreLayout = ({ children }) => (
  <div style={{height: '100%'}} className={classes.flexContainer}>
    <Header />
    <div className={classes.flexContainer + ' ' + classes.flexItem}>
      {children}
    </div>
    <Header />
  </div>
)

CoreLayout.propTypes = {
  children: React.PropTypes.element.isRequired
}

export default CoreLayout
